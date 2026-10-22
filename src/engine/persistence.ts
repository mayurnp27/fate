import type { Metrics, OutcomeInterval, SimulationResult } from "./schemas.ts";

export function normalizePersistedSimulation(result: SimulationResult): SimulationResult {
  const relativeLift =
    result.baseline.conversionRate > 0
      ? result.simulated.conversionRate / result.baseline.conversionRate - 1
      : result.offer.conversionLift;
  const point = (value: number): OutcomeInterval => ({ p10: value, p50: value, p90: value });
  const pointOutcomes = (metrics: Metrics) => ({
    conversionRate: point(metrics.conversionRate),
    revenue: point(metrics.revenue),
    grossProfit: point(metrics.grossProfit),
  });
  return {
    ...result,
    evidenceBlend: result.evidenceBlend ?? {
      relativeLift,
      profile: "Legacy fixed-lift snapshot",
      sources: [
        {
          key: "synthetic",
          label: "Legacy scenario assumption",
          weight: 1,
          estimate: relativeLift,
          basis: "Saved before dynamic evidence weighting; the original result is preserved.",
        },
      ],
    },
    distribution: result.distribution ?? {
      worlds: 0,
      method: "legacy-point-estimate",
      baseline: pointOutcomes(result.baseline),
      simulated: pointOutcomes(result.simulated),
    },
    sensitivity: result.sensitivity ?? [],
    decisionReadiness: result.decisionReadiness ?? {
      status: result.confidence.score >= 50 ? "directional" : "exploratory",
      label: result.confidence.score >= 50 ? "Directional decision support" : "Exploratory only",
      reason: "Legacy snapshot; rerun this scenario to calculate current uncertainty intervals.",
    },
  };
}

