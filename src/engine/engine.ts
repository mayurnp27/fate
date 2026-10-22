import { buildEvidenceBlend, type EvidenceBlendOptions } from "./evidence.ts";
import type {
  DecisionReadiness,
  Lead,
  Metrics,
  Offer,
  OutcomeDistribution,
  OutcomeInterval,
  PopulationFilter,
  SensitivityCase,
  SimulationResult,
} from "./schemas.ts";

const MONTE_CARLO_WORLDS = 1_000;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export function filterLeads(leads: Lead[], filter: PopulationFilter, now = new Date()): Lead[] {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - filter.months);
  return leads.filter(
    (lead) =>
      new Date(lead.createdAt) >= cutoff &&
      (filter.objection === "all" || lead.features.primaryObjection === filter.objection) &&
      (filter.region === "all" || lead.region === filter.region) &&
      (filter.segment === "all" || lead.segment === filter.segment),
  );
}

function aggregate(leads: Lead[], conversionRate?: number, offer?: Offer): Metrics {
  const leadCount = leads.length;
  const won = leads.filter((lead) => lead.converted);
  const conversions =
    conversionRate == null
      ? won.length
      : Math.min(leadCount, Math.round(leadCount * conversionRate));
  const avgDeal = won.length
    ? won.reduce((sum, lead) => sum + lead.dealValue, 0) / won.length
    : leads.reduce((sum, lead) => sum + lead.dealValue, 0) / Math.max(1, leadCount);
  const wonRevenue = won.reduce((sum, lead) => sum + lead.dealValue, 0);
  const historicalMargin = wonRevenue
    ? won.reduce((sum, lead) => sum + lead.grossMargin * lead.dealValue, 0) / wonRevenue
    : leads.reduce((sum, lead) => sum + lead.grossMargin, 0) / Math.max(1, leadCount);
  const revenue = conversions * avgDeal * (offer?.revenueMultiplier ?? 1);
  const grossMargin = Math.max(0, historicalMargin - (offer?.marginCost ?? 0));
  return {
    leads: leadCount,
    conversions,
    conversionRate: leadCount ? conversions / leadCount : 0,
    revenue,
    grossProfit: revenue * grossMargin,
    grossMargin,
  };
}

function seedFrom(value: string) {
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalSample(random: () => number) {
  const first = Math.max(Number.EPSILON, random());
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function gammaSample(shape: number, random: () => number): number {
  if (shape < 1) {
    return gammaSample(shape + 1, random) * Math.pow(Math.max(Number.EPSILON, random()), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    const normal = normalSample(random);
    const adjusted = 1 + c * normal;
    if (adjusted <= 0) continue;
    const cube = adjusted * adjusted * adjusted;
    const uniform = random();
    if (
      uniform < 1 - 0.0331 * normal ** 4 ||
      Math.log(uniform) < 0.5 * normal * normal + d * (1 - cube + Math.log(cube))
    ) {
      return d * cube;
    }
  }
}

function betaSample(alpha: number, beta: number, random: () => number) {
  const left = gammaSample(alpha, random);
  const right = gammaSample(beta, random);
  return left / (left + right);
}

function binomialSample(trials: number, probability: number, random: () => number) {
  let successes = 0;
  for (let index = 0; index < trials; index += 1) {
    if (random() < probability) successes += 1;
  }
  return successes;
}

function interval(values: number[]): OutcomeInterval {
  const ordered = [...values].sort((left, right) => left - right);
  const at = (quantile: number) => ordered[Math.floor((ordered.length - 1) * quantile)] ?? 0;
  return { p10: at(0.1), p50: at(0.5), p90: at(0.9) };
}

function outcomeDistribution(
  population: Lead[],
  baseline: Metrics,
  offer: Offer,
  relativeLift: number,
  seedKey: string,
): OutcomeDistribution {
  const random = seededRandom(seedFrom(seedKey));
  const won = population.filter((lead) => lead.converted);
  const averageDeal = won.length
    ? won.reduce((sum, lead) => sum + lead.dealValue, 0) / won.length
    : population.reduce((sum, lead) => sum + lead.dealValue, 0) / Math.max(1, population.length);
  const liftUncertainty = population.length < 30 ? 0.65 : population.length <= 100 ? 0.4 : 0.25;
  const liftStandardDeviation = Math.max(0.025, Math.abs(relativeLift) * liftUncertainty);
  const baselineConversion: number[] = [];
  const baselineRevenue: number[] = [];
  const baselineGrossProfit: number[] = [];
  const simulatedConversion: number[] = [];
  const simulatedRevenue: number[] = [];
  const simulatedGrossProfit: number[] = [];

  for (let world = 0; world < MONTE_CARLO_WORLDS; world += 1) {
    const baselineProbability = betaSample(
      baseline.conversions + 0.5,
      Math.max(0, baseline.leads - baseline.conversions) + 0.5,
      random,
    );
    const sampledLift = clamp(
      relativeLift + normalSample(random) * liftStandardDeviation,
      -0.95,
      2,
    );
    const simulatedProbability = clamp(baselineProbability * (1 + sampledLift), 0, 0.95);
    const baselineConversions = binomialSample(population.length, baselineProbability, random);
    const simulatedConversions = binomialSample(population.length, simulatedProbability, random);
    const baselineWorldRevenue = baselineConversions * averageDeal;
    const simulatedWorldRevenue = simulatedConversions * averageDeal * offer.revenueMultiplier;

    baselineConversion.push(population.length ? baselineConversions / population.length : 0);
    baselineRevenue.push(baselineWorldRevenue);
    baselineGrossProfit.push(baselineWorldRevenue * baseline.grossMargin);
    simulatedConversion.push(population.length ? simulatedConversions / population.length : 0);
    simulatedRevenue.push(simulatedWorldRevenue);
    simulatedGrossProfit.push(
      simulatedWorldRevenue * Math.max(0, baseline.grossMargin - offer.marginCost),
    );
  }

  return {
    worlds: MONTE_CARLO_WORLDS,
    method: "seeded-monte-carlo",
    baseline: {
      conversionRate: interval(baselineConversion),
      revenue: interval(baselineRevenue),
      grossProfit: interval(baselineGrossProfit),
    },
    simulated: {
      conversionRate: interval(simulatedConversion),
      revenue: interval(simulatedRevenue),
      grossProfit: interval(simulatedGrossProfit),
    },
  };
}

function sensitivityCases(
  population: Lead[],
  baseline: Metrics,
  offer: Offer,
  relativeLift: number,
): SensitivityCase[] {
  return (
    [
      ["Conservative", 0.5],
      ["Base case", 1],
      ["Upside", 1.5],
    ] as const
  ).map(([label, multiplier]) => {
    const lift = clamp(relativeLift * multiplier, -0.95, 2);
    const metrics = aggregate(
      population,
      Math.min(0.95, baseline.conversionRate * (1 + lift)),
      offer,
    );
    return {
      label,
      relativeLift: lift,
      conversionRate: metrics.conversionRate,
      revenue: metrics.revenue,
      grossProfit: metrics.grossProfit,
    };
  });
}

function decisionReadiness(
  population: Lead[],
  baseline: Metrics,
  confidenceScore: number,
  evidenceOptions: EvidenceBlendOptions,
): DecisionReadiness {
  if (evidenceOptions.mode === "synthetic-only") {
    return {
      status: "exploratory",
      label: "Synthetic validation only",
      reason: "Use this result to test engine behavior, not to forecast or commit capital.",
    };
  }
  if (population.length < 10 || baseline.conversions < 2) {
    return {
      status: "abstain",
      label: "Insufficient evidence",
      reason: "Do not use this result to commit capital; gather more resolved outcomes first.",
    };
  }
  if (confidenceScore < 50 || population.length < 30 || baseline.conversions < 5) {
    return {
      status: "exploratory",
      label: "Exploratory only",
      reason: "Use this result to design a controlled test, not as a forecast or launch decision.",
    };
  }
  return {
    status: "directional",
    label: "Directional decision support",
    reason: "Compare the interval and sensitivities before choosing a controlled real-world test.",
  };
}

export function simulateOffer(
  allLeads: Lead[],
  filter: PopulationFilter,
  offer: Offer,
  scenario: string,
  now = new Date(),
  evidenceOptions: EvidenceBlendOptions = {},
): SimulationResult {
  const population = filterLeads(allLeads, filter, now);
  const baseline = aggregate(population);
  const evidenceBlend = buildEvidenceBlend(population, baseline, offer, evidenceOptions);
  const simulatedRate = Math.min(0.95, baseline.conversionRate * (1 + evidenceBlend.relativeLift));
  const simulated = aggregate(population, simulatedRate, offer);
  const sampleScore = Math.min(1, population.length / 250);
  const outcomeScore = Math.min(1, baseline.conversions / 30);
  const signaled = population.filter((lead) => lead.features.primaryObjection !== "none").length;
  const featureScore = population.length ? signaled / population.length : 0;
  const evidenceQuality = evidenceBlend.sources.reduce((score, source) => {
    const quality = source.key === "company" ? 0.55 : source.key === "industry" ? 0.45 : 0.2;
    return score + source.weight * quality;
  }, 0);
  const uncalibratedConfidenceScore = Math.round(
    (sampleScore * 0.35 + outcomeScore * 0.25 + featureScore * 0.15 + evidenceQuality * 0.25) * 100,
  );
  const confidenceScore = evidenceOptions.controlledExperiment
    ? uncalibratedConfidenceScore
    : Math.min(74, uncalibratedConfidenceScore);
  const confidenceLabel = confidenceScore >= 75 ? "High" : confidenceScore >= 50 ? "Medium" : "Low";
  const distribution = outcomeDistribution(
    population,
    baseline,
    offer,
    evidenceBlend.relativeLift,
    JSON.stringify({
      scenario,
      offer: offer.id,
      filter,
      population: population.map((lead) => lead.id),
    }),
  );
  const sensitivity = sensitivityCases(population, baseline, offer, evidenceBlend.relativeLift);
  const readiness = decisionReadiness(population, baseline, confidenceScore, evidenceOptions);
  const segmentNames = ["SMB", "Mid-market", "Enterprise"] as const;

  return {
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    scenario,
    offer,
    filter,
    baseline,
    simulated,
    deltas: {
      conversionRate: simulated.conversionRate - baseline.conversionRate,
      revenue: simulated.revenue - baseline.revenue,
      grossProfit: simulated.grossProfit - baseline.grossProfit,
      grossMargin: simulated.grossMargin - baseline.grossMargin,
    },
    confidence: {
      score: confidenceScore,
      label: confidenceLabel,
      reasons: [
        `${population.length} historical leads match the selected population.`,
        `${baseline.conversions} observed conversions anchor the baseline.`,
        `${Math.round(featureScore * 100)}% of leads have an explicit behavioral signal.`,
        `${evidenceBlend.profile} sets the evidence weights automatically.`,
        evidenceOptions.controlledExperiment
          ? "A resolved company experiment supplies calibration evidence."
          : "No resolved experiment calibration is attached, so confidence is capped below High.",
      ],
    },
    decisionReadiness: readiness,
    distribution,
    sensitivity,
    evidenceBlend,
    evidence: [
      `Baseline uses observed outcomes from ${population.length} matching leads.`,
      `Scenario applies a ${(evidenceBlend.relativeLift * 100).toFixed(1)}% blended relative lift only to that population.`,
      `${distribution.worlds.toLocaleString()} reproducible statistical worlds produce the displayed uncertainty interval.`,
      "Revenue and gross profit are recomputed from historical average deal value and weighted margin.",
    ],
    assumptions: offer.assumptions,
    segments: segmentNames
      .map((segment) => {
        const segmentLeads = population.filter((lead) => lead.segment === segment);
        const segmentBaseline = aggregate(segmentLeads);
        const segmentSimulated = aggregate(
          segmentLeads,
          Math.min(0.95, segmentBaseline.conversionRate * (1 + evidenceBlend.relativeLift)),
          offer,
        );
        return {
          name: segment,
          leads: segmentLeads.length,
          baselineRate: segmentBaseline.conversionRate,
          simulatedRate: segmentSimulated.conversionRate,
          revenueDelta: segmentSimulated.revenue - segmentBaseline.revenue,
        };
      })
      .filter((segment) => segment.leads > 0),
  };
}
