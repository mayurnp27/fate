import type { EvidenceBlend, EvidenceSourceKey, Lead, Metrics, Offer } from "./schemas.ts";

export type EvidenceWeights = Record<EvidenceSourceKey, number>;

export type EvidenceBlendOptions = {
  mode?: "company-blend" | "synthetic-only";
  controlledExperiment?: boolean;
  companyLift?: number;
  industryLift?: number;
  syntheticLift?: number;
};

const INDUSTRY_PRIOR_BY_OFFER: Record<Offer["type"], number> = {
  financing: 0.18,
  discount: 0.2,
  trial: 0.12,
  bundle: 0.1,
};

const clampLift = (value: number) => Math.max(-0.95, Math.min(2, value));

export function evidenceWeightsForSample(
  matchingLeads: number,
  controlledExperiment = false,
): { profile: string; weights: EvidenceWeights } {
  if (controlledExperiment) {
    return {
      profile: "Controlled experiment",
      weights: { company: 0.9, industry: 0.1, synthetic: 0 },
    };
  }
  if (matchingLeads < 30) {
    return {
      profile: "Early company evidence",
      weights: { company: 0.25, industry: 0.5, synthetic: 0.25 },
    };
  }
  if (matchingLeads <= 100) {
    return {
      profile: "Growing company evidence",
      weights: { company: 0.5, industry: 0.35, synthetic: 0.15 },
    };
  }
  return {
    profile: "Company-led evidence",
    weights: { company: 0.7, industry: 0.25, synthetic: 0.05 },
  };
}

function average(leads: Lead[], select: (lead: Lead) => number) {
  return leads.reduce((sum, lead) => sum + select(lead), 0) / Math.max(1, leads.length);
}

function matchedCompanyLift(population: Lead[], baseline: Metrics, offer: Offer) {
  const eligibleShare = average(population, (lead) =>
    offer.eligibleObjections.includes(lead.features.primaryObjection) ? 1 : 0,
  );
  const behavioralFit = average(population, (lead) => {
    if (offer.type === "financing" || offer.type === "discount") {
      return lead.features.priceSensitivity;
    }
    if (offer.type === "trial") return lead.features.engagement;
    return lead.features.urgency;
  });
  const fit = eligibleShare * 0.6 + behavioralFit * 0.4;
  const headroom = 1 - baseline.conversionRate;
  const fitMultiplier = 0.7 + fit * 0.3;
  const headroomMultiplier = 0.9 + headroom * 0.1;
  return clampLift(offer.conversionLift * fitMultiplier * headroomMultiplier);
}

export function buildEvidenceBlend(
  population: Lead[],
  baseline: Metrics,
  offer: Offer,
  options: EvidenceBlendOptions = {},
): EvidenceBlend {
  if (options.mode === "synthetic-only") {
    const estimate = clampLift(options.syntheticLift ?? offer.conversionLift);
    return {
      relativeLift: estimate,
      profile: "Synthetic benchmark validation",
      sources: [
        {
          key: "synthetic",
          label: "Synthetic lab",
          weight: 1,
          estimate,
          basis: "Deterministic test-lab scenario; no real-company evidence is claimed.",
        },
      ],
    };
  }

  const { profile, weights } = evidenceWeightsForSample(
    population.length,
    options.controlledExperiment,
  );
  const companyEstimate = clampLift(
    options.companyLift ?? matchedCompanyLift(population, baseline, offer),
  );
  const industryEstimate = clampLift(options.industryLift ?? INDUSTRY_PRIOR_BY_OFFER[offer.type]);
  const syntheticEstimate = clampLift(options.syntheticLift ?? offer.conversionLift);
  const relativeLift = clampLift(
    companyEstimate * weights.company +
      industryEstimate * weights.industry +
      syntheticEstimate * weights.synthetic,
  );

  return {
    relativeLift,
    profile,
    sources: [
      {
        key: "company",
        label: options.controlledExperiment ? "Company experiment" : "Company matched cohort",
        weight: weights.company,
        estimate: companyEstimate,
        basis: options.controlledExperiment
          ? "Measured treatment/control result supplied by the company."
          : `${population.length} matching leads inform behavioral fit and conversion headroom; this is not a causal measurement.`,
      },
      {
        key: "industry",
        label: "Industry prior",
        weight: weights.industry,
        estimate: industryEstimate,
        basis: "Prototype offer-type prior; replace with sourced, stage-matched industry data.",
      },
      {
        key: "synthetic",
        label: "Synthetic lab",
        weight: weights.synthetic,
        estimate: syntheticEstimate,
        basis: "Deterministic 100-offer test-lab prior used for coverage, not market truth.",
      },
    ],
  };
}
