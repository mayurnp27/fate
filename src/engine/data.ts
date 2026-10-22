import type { BehavioralFeatures, Lead } from "./schemas.ts";

type CrmLead = {
  id: string;
  created_at: string;
  stage: string;
  value: number | null;
  tags?: string[] | null;
  custom_fields?: unknown;
  notes?: string | null;
  source?: string | null;
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeCrmLead(row: CrmLead): Lead {
  const custom = objectValue(row.custom_fields);
  const tags = (row.tags || []).map((tag) => tag.toLowerCase());
  const objection = ["cost", "timing", "trust", "authority", "need"].find(
    (value) => custom.primary_objection === value || tags.includes(`objection:${value}`),
  );
  const features: BehavioralFeatures = {
    primaryObjection: (objection as BehavioralFeatures["primaryObjection"]) || "none",
    priceSensitivity: objection === "cost" ? 0.8 : 0.25,
    urgency: Number(custom.urgency ?? 0.5),
    engagement: Number(custom.engagement ?? 0.5),
    evidence: objection
      ? [`CRM behavioral tag: objection:${objection}`]
      : ["No structured objection is present on this CRM lead."],
    extractor: "historical",
  };
  const regionRaw = String(custom.region ?? "Unknown")
    .trim()
    .toLowerCase();
  const segmentRaw = String(custom.segment ?? "Unknown")
    .trim()
    .toLowerCase();
  const regionMap: Record<string, Lead["region"]> = {
    northeast: "Northeast",
    southeast: "Southeast",
    midwest: "Midwest",
    west: "West",
  };
  const segmentMap: Record<string, Lead["segment"]> = {
    smb: "SMB",
    "mid-market": "Mid-market",
    midmarket: "Mid-market",
    enterprise: "Enterprise",
  };
  const grossMarginRaw = Number(custom.gross_margin ?? 0.42);
  return {
    id: row.id,
    createdAt: row.created_at,
    region: regionMap[regionRaw] ?? "Unknown",
    segment: segmentMap[segmentRaw] ?? "Unknown",
    dealValue: Number(row.value) || 0,
    grossMargin: grossMarginRaw > 1 ? grossMarginRaw / 100 : grossMarginRaw,
    converted: row.stage.toLowerCase() === "won",
    transcript: row.notes || undefined,
    features,
  };
}

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 999 + salt * 71) * 10000;
  return value - Math.floor(value);
}

export function createDemoLeads(now = new Date()): Lead[] {
  const regions = ["Northeast", "Southeast", "Midwest", "West"] as const;
  const segments = ["SMB", "Mid-market", "Enterprise"] as const;
  const objections = ["cost", "cost", "timing", "trust", "authority", "need", "none"] as const;
  return Array.from({ length: 480 }, (_, index) => {
    const segment = segments[Math.floor(seeded(index, 2) * segments.length)];
    const objection = objections[Math.floor(seeded(index, 3) * objections.length)];
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - Math.floor(seeded(index, 4) * 350));
    const baseValue = segment === "SMB" ? 8200 : segment === "Mid-market" ? 24500 : 68000;
    const conversionThreshold = objection === "cost" ? 0.14 : objection === "none" ? 0.28 : 0.19;
    return {
      id: `demo-${String(index + 1).padStart(3, "0")}`,
      createdAt: createdAt.toISOString(),
      region: regions[Math.floor(seeded(index, 1) * regions.length)],
      segment,
      dealValue: Math.round(baseValue * (0.75 + seeded(index, 5) * 0.5)),
      grossMargin: 0.38 + seeded(index, 6) * 0.12,
      converted: seeded(index, 7) < conversionThreshold,
      transcript:
        objection === "cost"
          ? "The upfront price is our blocker. Is financing available?"
          : undefined,
      features: {
        primaryObjection: objection,
        priceSensitivity: objection === "cost" ? 0.82 : 0.25,
        urgency: 0.3 + seeded(index, 8) * 0.65,
        engagement: 0.35 + seeded(index, 9) * 0.6,
        evidence:
          objection === "none"
            ? ["No explicit objection signal found"]
            : [`Historical call signal: ${objection}`],
        extractor: "historical",
      },
    };
  });
}
