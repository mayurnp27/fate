import type { BehavioralFeatures } from "./schemas.ts";

export interface TranscriptFeatureProvider {
  readonly name: string;
  extract(transcript: string): Promise<BehavioralFeatures>;
}

const signals = {
  cost: ["price", "expensive", "budget", "upfront", "afford", "financing"],
  timing: ["later", "quarter", "timing", "not now", "next year"],
  trust: ["proof", "trust", "reference", "case study", "risk"],
  authority: ["boss", "approval", "committee", "decision maker"],
  need: ["need", "priority", "problem", "use case"],
  none: [],
} as const;

export class MockTranscriptProvider implements TranscriptFeatureProvider {
  readonly name = "deterministic-keyword-mock";

  async extract(transcript: string): Promise<BehavioralFeatures> {
    const normalized = transcript.toLowerCase();
    const ranked = Object.entries(signals)
      .map(([key, terms]) => ({
        key: key as BehavioralFeatures["primaryObjection"],
        hits: terms.filter((term) => normalized.includes(term)),
      }))
      .sort((a, b) => b.hits.length - a.hits.length);
    const best = ranked[0];
    const primaryObjection = best.hits.length ? best.key : "none";
    const questionCount = (transcript.match(/\?/g) || []).length;
    const urgencyHits = ["today", "soon", "urgent", "this month"].filter((term) =>
      normalized.includes(term),
    ).length;

    return {
      primaryObjection,
      priceSensitivity: Math.min(1, signals.cost.filter((t) => normalized.includes(t)).length / 3),
      urgency: Math.min(1, 0.25 + urgencyHits * 0.25),
      engagement: Math.min(1, 0.35 + questionCount * 0.12),
      evidence: best.hits.length
        ? [
            `Matched ${best.hits.length} ${primaryObjection} signal${best.hits.length === 1 ? "" : "s"}: ${best.hits.join(", ")}`,
          ]
        : ["No explicit objection signal found"],
      extractor: "mock",
    };
  }
}

export function getTranscriptProvider(): TranscriptFeatureProvider {
  // Replace this factory with a credentialed extractor when one is configured.
  // The financial engine consumes only validated features and remains deterministic.
  return new MockTranscriptProvider();
}
