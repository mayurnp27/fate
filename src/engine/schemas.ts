import { z } from "zod";

export const objectionSchema = z.enum(["cost", "timing", "trust", "authority", "need", "none"]);
export const regionSchema = z.enum(["Northeast", "Southeast", "Midwest", "West", "Unknown"]);
export const segmentSchema = z.enum(["SMB", "Mid-market", "Enterprise", "Unknown"]);

export const behavioralFeaturesSchema = z.object({
  primaryObjection: objectionSchema,
  priceSensitivity: z.number().min(0).max(1),
  urgency: z.number().min(0).max(1),
  engagement: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  extractor: z.enum(["mock", "provider", "historical"]),
});

export const leadSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  region: regionSchema,
  segment: segmentSchema,
  dealValue: z.number().nonnegative(),
  grossMargin: z.number().min(0).max(1),
  converted: z.boolean(),
  transcript: z.string().optional(),
  features: behavioralFeaturesSchema,
});

export const offerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(["financing", "discount", "trial", "bundle"]),
  conversionLift: z.number().min(-0.95).max(2),
  revenueMultiplier: z.number().positive(),
  marginCost: z.number().min(0).max(1),
  eligibleObjections: z.array(objectionSchema),
  assumptions: z.array(z.string()),
});

export const populationFilterSchema = z.object({
  objection: objectionSchema.or(z.literal("all")),
  region: regionSchema.or(z.literal("all")),
  segment: segmentSchema.or(z.literal("all")),
  months: z.number().int().positive().max(60),
});

export type Lead = z.infer<typeof leadSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type PopulationFilter = z.infer<typeof populationFilterSchema>;
export type BehavioralFeatures = z.infer<typeof behavioralFeaturesSchema>;

export type Metrics = {
  leads: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  grossProfit: number;
  grossMargin: number;
};

export type SegmentImpact = {
  name: string;
  leads: number;
  baselineRate: number;
  simulatedRate: number;
  revenueDelta: number;
};

export type EvidenceSourceKey = "company" | "industry" | "synthetic";

export type EvidenceBlend = {
  relativeLift: number;
  profile: string;
  sources: Array<{
    key: EvidenceSourceKey;
    label: string;
    weight: number;
    estimate: number;
    basis: string;
  }>;
};

export type OutcomeInterval = {
  p10: number;
  p50: number;
  p90: number;
};

export type OutcomeDistribution = {
  worlds: number;
  method: "seeded-monte-carlo" | "legacy-point-estimate";
  baseline: {
    conversionRate: OutcomeInterval;
    revenue: OutcomeInterval;
    grossProfit: OutcomeInterval;
  };
  simulated: {
    conversionRate: OutcomeInterval;
    revenue: OutcomeInterval;
    grossProfit: OutcomeInterval;
  };
};

export type SensitivityCase = {
  label: "Conservative" | "Base case" | "Upside";
  relativeLift: number;
  conversionRate: number;
  revenue: number;
  grossProfit: number;
};

export type DecisionReadiness = {
  status: "abstain" | "exploratory" | "directional";
  label: string;
  reason: string;
};

export type SimulationResult = {
  id: string;
  createdAt: string;
  scenario: string;
  offer: Offer;
  filter: PopulationFilter;
  baseline: Metrics;
  simulated: Metrics;
  deltas: Pick<Metrics, "conversionRate" | "revenue" | "grossProfit" | "grossMargin">;
  confidence: { score: number; label: "Low" | "Medium" | "High"; reasons: string[] };
  decisionReadiness: DecisionReadiness;
  distribution: OutcomeDistribution;
  sensitivity: SensitivityCase[];
  evidenceBlend: EvidenceBlend;
  evidence: string[];
  assumptions: string[];
  segments: SegmentImpact[];
};
