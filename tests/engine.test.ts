import { describe, expect, it } from "vitest";
import { parseLeadsCsv } from "../src/engine/csv.ts";
import { createDemoLeads, normalizeCrmLead } from "../src/engine/data.ts";
import { filterLeads, simulateOffer } from "../src/engine/engine.ts";
import { evidenceWeightsForSample } from "../src/engine/evidence.ts";
import { OFFER_LIBRARY, offerFromScenario } from "../src/engine/offers.ts";
import { normalizePersistedSimulation } from "../src/engine/persistence.ts";
import {
  createSyntheticConversations,
  createSyntheticLeads,
  createSyntheticOffers,
  runSyntheticBenchmark,
  SALES_CYCLES,
  SALES_NICHES,
} from "../src/engine/synthetic.ts";

const NOW = new Date("2026-08-28T12:00:00.000Z");
const costFilter = { objection: "cost", region: "all", segment: "all", months: 12 } as const;

describe("offer simulator", () => {
  it("filters a deterministic population", () => {
    const leads = createDemoLeads(NOW);
    const population = filterLeads(leads, costFilter, NOW);
    expect(population.length).toBeGreaterThan(100);
    expect(population.every((lead) => lead.features.primaryObjection === "cost")).toBe(true);
  });

  it("keeps financial arithmetic deterministic and exposes the tradeoff", () => {
    const leads = createDemoLeads(NOW);
    const first = simulateOffer(leads, costFilter, OFFER_LIBRARY.financing, "0% financing", NOW);
    const second = simulateOffer(leads, costFilter, OFFER_LIBRARY.financing, "0% financing", NOW);
    expect(first.baseline).toEqual(second.baseline);
    expect(first.simulated).toEqual(second.simulated);
    expect(first.simulated.conversionRate).toBeGreaterThan(first.baseline.conversionRate);
    expect(first.simulated.grossMargin).toBeLessThan(first.baseline.grossMargin);
    expect(first.evidence.length).toBeGreaterThan(0);
    expect(first.assumptions.length).toBeGreaterThan(0);
    expect(first.distribution).toEqual(second.distribution);
    expect(first.distribution.worlds).toBe(1_000);
    expect(first.distribution.simulated.revenue.p10).toBeLessThanOrEqual(
      first.distribution.simulated.revenue.p50,
    );
    expect(first.distribution.simulated.revenue.p50).toBeLessThanOrEqual(
      first.distribution.simulated.revenue.p90,
    );
    expect(first.sensitivity.map((item) => item.label)).toEqual([
      "Conservative",
      "Base case",
      "Upside",
    ]);
    expect(first.evidenceBlend.sources.reduce((sum, source) => sum + source.weight, 0)).toBe(1);
    expect(first.evidence.some((item) => item.includes("blended relative lift"))).toBe(true);
  });

  it("moves evidence weight toward company data as matching samples grow", () => {
    expect(evidenceWeightsForSample(12).weights).toEqual({
      company: 0.25,
      industry: 0.5,
      synthetic: 0.25,
    });
    expect(evidenceWeightsForSample(60).weights).toEqual({
      company: 0.5,
      industry: 0.35,
      synthetic: 0.15,
    });
    expect(evidenceWeightsForSample(140).weights).toEqual({
      company: 0.7,
      industry: 0.25,
      synthetic: 0.05,
    });
    expect(evidenceWeightsForSample(500, true).weights).toEqual({
      company: 0.9,
      industry: 0.1,
      synthetic: 0,
    });
  });

  it("keeps older saved simulations readable after evidence blending is added", () => {
    const current = simulateOffer(
      createDemoLeads(NOW),
      costFilter,
      OFFER_LIBRARY.financing,
      "0% financing",
      NOW,
    );
    const legacy = { ...current } as Partial<typeof current>;
    delete legacy.evidenceBlend;
    delete legacy.distribution;
    delete legacy.sensitivity;
    delete legacy.decisionReadiness;
    const normalized = normalizePersistedSimulation(legacy as typeof current);
    expect(normalized.evidenceBlend.profile).toBe("Legacy fixed-lift snapshot");
    expect(normalized.evidenceBlend.sources[0].weight).toBe(1);
    expect(normalized.distribution.method).toBe("legacy-point-estimate");
    expect(normalized.decisionReadiness.reason).toContain("Legacy snapshot");
  });

  it("abstains when the resolved evidence cannot support a capital decision", () => {
    const sparseLeads = createDemoLeads(NOW).slice(0, 8);
    const result = simulateOffer(
      sparseLeads,
      { objection: "all", region: "all", segment: "all", months: 24 },
      OFFER_LIBRARY.financing,
      "Test financing",
      NOW,
    );
    expect(result.decisionReadiness.status).toBe("abstain");
    expect(result.decisionReadiness.reason).toContain("Do not use");
  });

  it("maps natural-language offers to fixed offer definitions", () => {
    expect(offerFromScenario("Give them a 30-day pilot").type).toBe("trial");
    expect(offerFromScenario("Offer a 10% discount").type).toBe("discount");
    expect(offerFromScenario("Can we include onboarding?").type).toBe("bundle");
    expect(offerFromScenario("Test 0% financing").type).toBe("financing");
  });

  it("normalizes a CSV and derives transcript behavior without credentials", async () => {
    const csv = `id,created_at,region,segment,deal_value,gross_margin,converted,transcript
one,2026-08-01,Northeast,SMB,12000,44%,yes,"The upfront price is too expensive. Can we use financing?"`;
    const [lead] = await parseLeadsCsv(csv);
    expect(lead.converted).toBe(true);
    expect(lead.grossMargin).toBe(0.44);
    expect(lead.features.primaryObjection).toBe("cost");
    expect(lead.features.extractor).toBe("mock");
  });

  it("normalizes GoHighLevel opportunity fields for simulation", () => {
    const lead = normalizeCrmLead({
      id: "ghl-opportunity-1",
      created_at: "2026-07-01T12:00:00.000Z",
      stage: "Won",
      value: 28000,
      source: "GoHighLevel",
      tags: ["objection:cost", "region:northeast", "segment:mid-market"],
      notes: null,
      custom_fields: {
        primary_objection: "cost",
        region: "northeast",
        segment: "mid-market",
        gross_margin: 0.46,
      },
    });
    expect(lead.converted).toBe(true);
    expect(lead.region).toBe("Northeast");
    expect(lead.segment).toBe("Mid-market");
    expect(lead.grossMargin).toBe(0.46);
    expect(lead.features.primaryObjection).toBe("cost");
  });

  it("creates exactly 100 stage-specific offers across 25 niches and five sales cycles", () => {
    const offers = createSyntheticOffers();
    expect(SALES_NICHES).toHaveLength(25);
    expect(SALES_CYCLES).toHaveLength(5);
    expect(offers).toHaveLength(100);
    for (const niche of SALES_NICHES) {
      expect(offers.filter((offer) => offer.nicheId === niche.id)).toHaveLength(4);
    }
    expect(new Set(offers.map((offer) => offer.salesCycleId))).toEqual(
      new Set(SALES_CYCLES.map((cycle) => cycle.id)),
    );
    expect(
      offers.every((offer) => {
        const cycle = SALES_CYCLES.find((item) => item.id === offer.salesCycleId);
        return cycle?.stages.includes(offer.targetStage) ?? false;
      }),
    ).toBe(true);
  });

  it("generates deterministic, niche- and stage-labeled synthetic history", () => {
    const first = createSyntheticLeads(NOW);
    const second = createSyntheticLeads(NOW);
    expect(first).toHaveLength(50_000);
    expect(first[1234]).toEqual(second[1234]);
    expect(first.every((lead) => lead.nicheId && lead.icp && lead.salesCycle && lead.stage)).toBe(
      true,
    );
  });

  it("creates three months of simple question-led conversations for every offer", () => {
    const offers = createSyntheticOffers();
    const conversations = createSyntheticConversations(offers, NOW);
    expect(conversations).toHaveLength(3_600);
    expect(new Set(conversations.map((conversation) => conversation.monthKey)).size).toBe(3);
    for (const offer of offers) {
      expect(
        conversations.filter((conversation) => conversation.offerId === offer.id),
      ).toHaveLength(36);
    }
    expect(
      conversations.every(
        (conversation) =>
          conversation.sellingProcess === "question-led-assumptive" &&
          conversation.turns.some((turn) => turn.speaker === "rep" && turn.text.endsWith("?")) &&
          conversation.turns.some(
            (turn) => turn.speaker === "rep" && turn.text.includes("Let's plan"),
          ) &&
          conversation.turns.every((turn) => turn.text.split(/\s+/).length <= 15) &&
          conversation.customer.transcript ===
            conversation.turns
              .map((turn) => `${turn.speaker === "rep" ? "Rep" : "Customer"}: ${turn.text}`)
              .join("\n"),
      ),
    ).toBe(true);
  });

  it("runs all 100 offers deterministically with finite financial outputs", () => {
    const first = runSyntheticBenchmark(NOW);
    const second = runSyntheticBenchmark(NOW);
    expect(first.offerCount).toBe(100);
    expect(first.nicheCount).toBe(25);
    expect(first.cycleCount).toBe(5);
    expect(first.monthsCovered).toBe(3);
    expect(first.conversationCount).toBe(3_600);
    expect(first.leadCount).toBe(3_600);
    expect(first.runs).toHaveLength(100);
    expect(first.runs.map((run) => run.result.deltas)).toEqual(
      second.runs.map((run) => run.result.deltas),
    );
    expect(
      first.runs.every(
        (run) =>
          run.result.baseline.leads > 0 &&
          run.conversations.length === 36 &&
          Object.values(run.result.deltas).every(Number.isFinite) &&
          run.result.evidenceBlend.sources.length === 1 &&
          run.result.evidenceBlend.sources[0].key === "synthetic" &&
          run.result.evidenceBlend.sources[0].weight === 1 &&
          run.result.decisionReadiness.status === "exploratory" &&
          run.result.evidence.some((item) => item.includes("three months")),
      ),
    ).toBe(true);
  });
});
