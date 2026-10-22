import { simulateOffer } from "./engine.ts";
import type { Lead, Offer, PopulationFilter, SimulationResult } from "./schemas.ts";

export type SalesNiche = {
  id: string;
  name: string;
  icp: string;
  averageDealValue: number;
  grossMargin: number;
  baselineCloseRate: number;
};

export type SalesCycle = {
  id: string;
  name: string;
  stages: readonly [string, string, string, string, string];
  closeRateMultiplier: number;
};

export type SyntheticLead = Lead & {
  nicheId: string;
  niche: string;
  icp: string;
  salesCycleId: string;
  salesCycle: string;
  stage: string;
};

export type SyntheticOffer = Offer & {
  nicheId: string;
  niche: string;
  icp: string;
  salesCycleId: string;
  salesCycle: string;
  targetStage: string;
};

export type ConversationTurn = {
  speaker: "rep" | "customer";
  text: string;
};

export type SyntheticConversation = {
  id: string;
  offerId: string;
  customerId: string;
  occurredAt: string;
  monthKey: string;
  niche: string;
  icp: string;
  salesCycle: string;
  stage: string;
  outcome: "won" | "advanced" | "lost";
  sellingProcess: "question-led-assumptive";
  turns: ConversationTurn[];
  customer: SyntheticLead;
};

export type SyntheticRun = {
  offer: SyntheticOffer;
  result: SimulationResult;
  conversations: SyntheticConversation[];
};
export type SyntheticBenchmark = {
  generatedAt: string;
  leadCount: number;
  conversationCount: number;
  monthsCovered: number;
  offerCount: number;
  nicheCount: number;
  cycleCount: number;
  winners: number;
  averageConversionLift: number;
  totalGrossProfitDelta: number;
  runs: SyntheticRun[];
};

export const SALES_NICHES: SalesNiche[] = [
  {
    id: "revops-saas",
    name: "RevOps SaaS",
    icp: "VP Sales at 50–500 employee B2B SaaS",
    averageDealValue: 32000,
    grossMargin: 0.82,
    baselineCloseRate: 0.18,
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    icp: "CISO at regulated mid-market companies",
    averageDealValue: 78000,
    grossMargin: 0.84,
    baselineCloseRate: 0.14,
  },
  {
    id: "hr-tech",
    name: "HR technology",
    icp: "Chief People Officer at distributed companies",
    averageDealValue: 36000,
    grossMargin: 0.8,
    baselineCloseRate: 0.17,
  },
  {
    id: "fintech",
    name: "Fintech",
    icp: "Finance leader at digital-first SMBs",
    averageDealValue: 46000,
    grossMargin: 0.76,
    baselineCloseRate: 0.15,
  },
  {
    id: "healthtech",
    name: "Healthtech",
    icp: "Operations leader at multi-site clinics",
    averageDealValue: 62000,
    grossMargin: 0.72,
    baselineCloseRate: 0.13,
  },
  {
    id: "legaltech",
    name: "Legal technology",
    icp: "Managing partner at 20–200 attorney firms",
    averageDealValue: 41000,
    grossMargin: 0.78,
    baselineCloseRate: 0.16,
  },
  {
    id: "proptech",
    name: "Property technology",
    icp: "Portfolio operator managing 500+ units",
    averageDealValue: 38000,
    grossMargin: 0.74,
    baselineCloseRate: 0.16,
  },
  {
    id: "martech",
    name: "Marketing technology",
    icp: "Demand generation leader at growth-stage companies",
    averageDealValue: 29000,
    grossMargin: 0.81,
    baselineCloseRate: 0.19,
  },
  {
    id: "ecommerce",
    name: "E-commerce enablement",
    icp: "Founder of a $2M–$50M online brand",
    averageDealValue: 18000,
    grossMargin: 0.68,
    baselineCloseRate: 0.22,
  },
  {
    id: "agencies",
    name: "Growth agencies",
    icp: "Agency owner with 10–75 employees",
    averageDealValue: 24000,
    grossMargin: 0.58,
    baselineCloseRate: 0.21,
  },
  {
    id: "home-services",
    name: "Home services",
    icp: "Multi-crew operator above $3M annual revenue",
    averageDealValue: 14500,
    grossMargin: 0.46,
    baselineCloseRate: 0.24,
  },
  {
    id: "solar",
    name: "Residential solar",
    icp: "Homeowner with high utility spend",
    averageDealValue: 27000,
    grossMargin: 0.34,
    baselineCloseRate: 0.16,
  },
  {
    id: "roofing",
    name: "Roofing",
    icp: "Homeowner with storm or replacement urgency",
    averageDealValue: 16500,
    grossMargin: 0.39,
    baselineCloseRate: 0.23,
  },
  {
    id: "hvac",
    name: "HVAC",
    icp: "Homeowner replacing an aging system",
    averageDealValue: 12800,
    grossMargin: 0.42,
    baselineCloseRate: 0.26,
  },
  {
    id: "dental",
    name: "Dental groups",
    icp: "Owner of a 2–20 location dental group",
    averageDealValue: 22000,
    grossMargin: 0.61,
    baselineCloseRate: 0.2,
  },
  {
    id: "med-spa",
    name: "Medical spas",
    icp: "Med-spa owner above $1M annual revenue",
    averageDealValue: 15000,
    grossMargin: 0.59,
    baselineCloseRate: 0.24,
  },
  {
    id: "wealth",
    name: "Wealth management",
    icp: "High-net-worth household with $1M+ investable assets",
    averageDealValue: 30000,
    grossMargin: 0.67,
    baselineCloseRate: 0.17,
  },
  {
    id: "insurance",
    name: "Commercial insurance",
    icp: "Owner of a 25–250 employee business",
    averageDealValue: 26000,
    grossMargin: 0.48,
    baselineCloseRate: 0.19,
  },
  {
    id: "logistics",
    name: "Logistics",
    icp: "COO at a regional shipper or distributor",
    averageDealValue: 54000,
    grossMargin: 0.36,
    baselineCloseRate: 0.15,
  },
  {
    id: "manufacturing",
    name: "Manufacturing technology",
    icp: "Plant leader at a 100–1,000 employee manufacturer",
    averageDealValue: 86000,
    grossMargin: 0.62,
    baselineCloseRate: 0.12,
  },
  {
    id: "coaching",
    name: "Education and coaching",
    icp: "Expert business with an audience and validated offer",
    averageDealValue: 9000,
    grossMargin: 0.71,
    baselineCloseRate: 0.25,
  },
  {
    id: "recruiting",
    name: "Recruitment services",
    icp: "Talent leader filling 10+ specialist roles annually",
    averageDealValue: 34000,
    grossMargin: 0.55,
    baselineCloseRate: 0.18,
  },
  {
    id: "real-estate",
    name: "Real estate teams",
    icp: "Broker or team leader closing 100+ sides annually",
    averageDealValue: 17500,
    grossMargin: 0.52,
    baselineCloseRate: 0.21,
  },
  {
    id: "automotive",
    name: "Automotive retail",
    icp: "Dealer group with 2–25 rooftops",
    averageDealValue: 28000,
    grossMargin: 0.49,
    baselineCloseRate: 0.2,
  },
  {
    id: "business-lending",
    name: "Business lending",
    icp: "Established SMB seeking $50K–$500K growth capital",
    averageDealValue: 21000,
    grossMargin: 0.57,
    baselineCloseRate: 0.18,
  },
];

export const SALES_CYCLES: SalesCycle[] = [
  {
    id: "smb-inbound",
    name: "SMB inbound",
    stages: ["Discovery", "Qualification", "Demo", "Proposal", "Closed"],
    closeRateMultiplier: 1.12,
  },
  {
    id: "midmarket-consultative",
    name: "Mid-market consultative",
    stages: ["Diagnose", "Solution fit", "Stakeholder review", "Business case", "Procurement"],
    closeRateMultiplier: 0.96,
  },
  {
    id: "enterprise-multithreaded",
    name: "Enterprise multi-threaded",
    stages: [
      "Account research",
      "Champion",
      "Technical validation",
      "Executive alignment",
      "Legal & procurement",
    ],
    closeRateMultiplier: 0.72,
  },
  {
    id: "transactional",
    name: "Transactional velocity",
    stages: ["Lead", "Contacted", "Offer viewed", "Checkout", "Won"],
    closeRateMultiplier: 1.28,
  },
  {
    id: "partner-led",
    name: "Partner-led",
    stages: ["Referral", "Introduction", "Joint discovery", "Commercial review", "Contract"],
    closeRateMultiplier: 1.06,
  },
];

const OFFER_VARIANTS = [
  {
    id: "pilot",
    label: "Risk-free outcome pilot",
    type: "trial" as const,
    objection: "trust" as const,
    lift: 0.22,
    revenueMultiplier: 0.97,
    marginCost: 0.018,
  },
  {
    id: "bundle",
    label: "Done-with-you implementation bundle",
    type: "bundle" as const,
    objection: "timing" as const,
    lift: 0.17,
    revenueMultiplier: 1.07,
    marginCost: 0.042,
  },
  {
    id: "financing",
    label: "Flexible launch financing",
    type: "financing" as const,
    objection: "cost" as const,
    lift: 0.27,
    revenueMultiplier: 1,
    marginCost: 0.032,
  },
  {
    id: "incentive",
    label: "ICP activation incentive",
    type: "discount" as const,
    objection: "authority" as const,
    lift: 0.31,
    revenueMultiplier: 0.91,
    marginCost: 0,
  },
] as const;

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 1237.17 + salt * 97.31) * 10000;
  return value - Math.floor(value);
}

export function createSyntheticOffers(): SyntheticOffer[] {
  return SALES_NICHES.flatMap((niche, nicheIndex) =>
    OFFER_VARIANTS.map((variant, variantIndex) => {
      const offerIndex = nicheIndex * OFFER_VARIANTS.length + variantIndex;
      const cycle = SALES_CYCLES[offerIndex % SALES_CYCLES.length];
      const targetStage = cycle.stages[(nicheIndex + variantIndex) % 4];
      return {
        id: `${niche.id}-${variant.id}`,
        name: `${niche.name}: ${variant.label}`,
        description: `${variant.label} for ${niche.icp}, introduced during ${targetStage}.`,
        type: variant.type,
        conversionLift: variant.lift + (nicheIndex % 3) * 0.01,
        revenueMultiplier: variant.revenueMultiplier,
        marginCost: variant.marginCost,
        eligibleObjections: [variant.objection],
        assumptions: [
          `Only ${niche.icp} in ${targetStage} receive the offer.`,
          `Historical close behavior is taken from the ${cycle.name} cohort.`,
          `A fixed ${Math.round((variant.lift + (nicheIndex % 3) * 0.01) * 100)}% relative lift is used; no AI estimates financial outputs.`,
        ],
        nicheId: niche.id,
        niche: niche.name,
        icp: niche.icp,
        salesCycleId: cycle.id,
        salesCycle: cycle.name,
        targetStage,
      };
    }),
  );
}

export function createSyntheticLeads(now = new Date("2026-08-28T12:00:00.000Z")): SyntheticLead[] {
  const regions = ["Northeast", "Southeast", "Midwest", "West"] as const;
  const objections = ["cost", "cost", "timing", "trust", "authority", "need"] as const;
  const stageMultipliers = [0.42, 0.68, 1, 1.35, 1.75];
  const leads: SyntheticLead[] = [];
  let row = 0;
  for (const niche of SALES_NICHES) {
    for (const cycle of SALES_CYCLES) {
      for (let stageIndex = 0; stageIndex < cycle.stages.length; stageIndex++) {
        for (let index = 0; index < 80; index++) {
          const convertedProbability = Math.min(
            0.82,
            niche.baselineCloseRate * cycle.closeRateMultiplier * stageMultipliers[stageIndex],
          );
          const createdAt = new Date(now);
          createdAt.setDate(createdAt.getDate() - Math.floor(seeded(row, 1) * 540));
          const objection = objections[Math.floor(seeded(row, 2) * objections.length)];
          leads.push({
            id: `synthetic-${niche.id}-${cycle.id}-${stageIndex}-${index}`,
            createdAt: createdAt.toISOString(),
            region: regions[Math.floor(seeded(row, 3) * regions.length)],
            segment:
              cycle.id === "enterprise-multithreaded"
                ? "Enterprise"
                : cycle.id === "transactional" || cycle.id === "smb-inbound"
                  ? "SMB"
                  : "Mid-market",
            dealValue: Math.round(niche.averageDealValue * (0.72 + seeded(row, 4) * 0.56)),
            grossMargin: Math.max(
              0.2,
              Math.min(0.92, niche.grossMargin - 0.04 + seeded(row, 5) * 0.08),
            ),
            converted: seeded(row, 6) < convertedProbability,
            transcript: `Synthetic ${cycle.name} evidence: ${objection} objection at ${cycle.stages[stageIndex]}.`,
            features: {
              primaryObjection: objection,
              priceSensitivity: objection === "cost" ? 0.84 : 0.28,
              urgency: 0.25 + seeded(row, 7) * 0.7,
              engagement: 0.3 + seeded(row, 8) * 0.65,
              evidence: [
                `Synthetic behavioral fixture: ${objection} at ${cycle.stages[stageIndex]}`,
              ],
              extractor: "historical",
            },
            nicheId: niche.id,
            niche: niche.name,
            icp: niche.icp,
            salesCycleId: cycle.id,
            salesCycle: cycle.name,
            stage: cycle.stages[stageIndex],
          });
          row++;
        }
      }
    }
  }
  return leads;
}

const CUSTOMER_OBJECTION_LINES = {
  cost: "The price is my main concern. I need a simple payment plan.",
  timing: "We are busy. I need to know how fast we can start.",
  trust: "I need clear proof that this will work for us.",
  authority: "My team needs to agree before we move ahead.",
  need: "I need to see how this solves our main problem.",
  none: "The offer looks clear. I just need the next step.",
} as const;

/**
 * Builds 36 conversations for every offer: 12 in each of the last three calendar months.
 * The language and outcomes are deterministic so benchmark changes can be compared safely.
 */
export function createSyntheticConversations(
  offers = createSyntheticOffers(),
  now = new Date("2026-08-28T12:00:00.000Z"),
): SyntheticConversation[] {
  const regions = ["Northeast", "Southeast", "Midwest", "West"] as const;
  const stageMultipliers = [0.42, 0.68, 1, 1.35, 1.75];

  return offers.flatMap((offer, offerIndex) => {
    const niche = SALES_NICHES.find((item) => item.id === offer.nicheId)!;
    const cycle = SALES_CYCLES.find((item) => item.id === offer.salesCycleId)!;
    const stageIndex = cycle.stages.indexOf(offer.targetStage);
    const objection = offer.eligibleObjections[0] ?? "none";

    return Array.from({ length: 36 }, (_, conversationIndex) => {
      const monthOffset = Math.floor(conversationIndex / 12);
      const occurredAt = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - monthOffset,
          2 + ((conversationIndex * 2 + offerIndex) % 24),
          14,
        ),
      );
      const seedIndex = offerIndex * 36 + conversationIndex;
      const closeProbability = Math.min(
        0.82,
        niche.baselineCloseRate * cycle.closeRateMultiplier * stageMultipliers[stageIndex],
      );
      const outcomeSeed = seeded(seedIndex, 31);
      const outcome: SyntheticConversation["outcome"] =
        outcomeSeed < closeProbability
          ? "won"
          : outcomeSeed < Math.min(0.9, closeProbability + 0.42)
            ? "advanced"
            : "lost";
      const customerId = `conversation-customer-${offer.id}-${conversationIndex + 1}`;
      const turns: ConversationTurn[] = [
        { speaker: "rep", text: "Thanks for meeting. What would make this worth doing now?" },
        { speaker: "customer", text: CUSTOMER_OBJECTION_LINES[objection] },
        { speaker: "rep", text: "If we solve that, are you ready to move ahead?" },
        { speaker: "customer", text: "Yes, if the next step is clear and easy." },
        {
          speaker: "rep",
          text: "Great. Let's plan the next step. Would Tuesday or Thursday work?",
        },
        {
          speaker: "customer",
          text:
            outcome === "won"
              ? "Tuesday works. Send the agreement."
              : outcome === "advanced"
                ? "Thursday works. Send the details first."
                : "Not yet. Please check back next month.",
        },
      ];
      const transcript = turns
        .map((turn) => `${turn.speaker === "rep" ? "Rep" : "Customer"}: ${turn.text}`)
        .join("\n");
      const customer: SyntheticLead = {
        id: customerId,
        createdAt: occurredAt.toISOString(),
        region: regions[Math.floor(seeded(seedIndex, 32) * regions.length)],
        segment:
          cycle.id === "enterprise-multithreaded"
            ? "Enterprise"
            : cycle.id === "transactional" || cycle.id === "smb-inbound"
              ? "SMB"
              : "Mid-market",
        dealValue: Math.round(niche.averageDealValue * (0.76 + seeded(seedIndex, 33) * 0.48)),
        grossMargin: Math.max(
          0.2,
          Math.min(0.92, niche.grossMargin - 0.035 + seeded(seedIndex, 34) * 0.07),
        ),
        converted: outcome === "won",
        transcript,
        features: {
          primaryObjection: objection,
          priceSensitivity: objection === "cost" ? 0.84 : 0.3,
          urgency: 0.3 + seeded(seedIndex, 35) * 0.62,
          engagement: outcome === "lost" ? 0.36 : outcome === "advanced" ? 0.68 : 0.88,
          evidence: [`Customer raised a ${objection} concern during ${offer.targetStage}.`],
          extractor: "historical",
        },
        nicheId: niche.id,
        niche: niche.name,
        icp: niche.icp,
        salesCycleId: cycle.id,
        salesCycle: cycle.name,
        stage: offer.targetStage,
      };

      return {
        id: `conversation-${offer.id}-${conversationIndex + 1}`,
        offerId: offer.id,
        customerId,
        occurredAt: occurredAt.toISOString(),
        monthKey: occurredAt.toISOString().slice(0, 7),
        niche: niche.name,
        icp: niche.icp,
        salesCycle: cycle.name,
        stage: offer.targetStage,
        outcome,
        sellingProcess: "question-led-assumptive",
        turns,
        customer,
      };
    });
  });
}

export function runSyntheticBenchmark(
  now = new Date("2026-08-28T12:00:00.000Z"),
): SyntheticBenchmark {
  const offers = createSyntheticOffers();
  const conversations = createSyntheticConversations(offers, now);
  const filter: PopulationFilter = { objection: "all", region: "all", segment: "all", months: 3 };
  const runs = offers
    .map((offer) => {
      const offerConversations = conversations.filter(
        (conversation) => conversation.offerId === offer.id,
      );
      const stageCohort = offerConversations.map((conversation) => conversation.customer);
      const result = simulateOffer(
        stageCohort,
        filter,
        offer,
        `${offer.name} for ${offer.icp} during ${offer.targetStage}`,
        now,
        { mode: "synthetic-only" },
      );
      result.id = `synthetic-run-${offer.id}`;
      result.evidence.unshift(
        `${offerConversations.length} customer conversations cover three months for this niche, ICP, cycle, stage, and concern.`,
      );
      return { offer, result, conversations: offerConversations };
    })
    .sort((a, b) => b.result.deltas.grossProfit - a.result.deltas.grossProfit);
  return {
    generatedAt: now.toISOString(),
    leadCount: conversations.length,
    conversationCount: conversations.length,
    monthsCovered: 3,
    offerCount: offers.length,
    nicheCount: SALES_NICHES.length,
    cycleCount: SALES_CYCLES.length,
    winners: runs.filter((run) => run.result.deltas.grossProfit > 0).length,
    averageConversionLift:
      runs.reduce((sum, run) => sum + run.result.deltas.conversionRate, 0) / runs.length,
    totalGrossProfitDelta: runs.reduce((sum, run) => sum + run.result.deltas.grossProfit, 0),
    runs,
  };
}
