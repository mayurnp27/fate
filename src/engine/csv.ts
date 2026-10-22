import Papa from "papaparse";
import { leadSchema, type Lead } from "./schemas.ts";
import { getTranscriptProvider } from "./transcript.ts";

type CsvRow = Record<string, string | undefined>;
const normalizeHeader = (header: string) =>
  header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function cell(row: CsvRow, ...names: string[]) {
  for (const name of names) {
    const value = row[normalizeHeader(name)];
    if (value != null && value !== "") return value.trim();
  }
  return "";
}

function normalizeRows(rows: Record<string, unknown>[]): CsvRow[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        normalizeHeader(key),
        value == null ? "" : String(value),
      ]),
    ),
  );
}

function numeric(value: string) {
  const cleaned = value.replace(/[$,%\s]/g, "");
  return cleaned ? Number(cleaned) : NaN;
}

export async function parseLeadsCsv(csv: string): Promise<Lead[]> {
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeHeader,
  });
  if (parsed.errors.length) throw new Error(parsed.errors[0].message);
  const rows = normalizeRows(parsed.data);
  if (!rows.length) throw new Error("The CSV does not contain any lead rows.");
  const required = ["id", "createdat", "dealvalue", "grossmargin", "converted"];
  const missing = required.filter((header) => !(header in rows[0]));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);

  const provider = getTranscriptProvider();
  return Promise.all(
    rows.map(async (row, index) => {
      const transcript = cell(row, "transcript", "call transcript", "notes");
      const features = await provider.extract(transcript);
      const marginRaw = numeric(cell(row, "gross margin", "grossmargin"));
      const objection = cell(row, "objection", "primary objection").toLowerCase();
      const region = cell(row, "region") || "Unknown";
      const segment = cell(row, "segment") || "Unknown";
      const dateText = cell(row, "created at", "createdat");
      const createdAt = new Date(dateText);
      if (!dateText || !Number.isFinite(createdAt.getTime())) throw new Error(`Row ${index + 2}: invalid created_at.`);
      for (const field of ["dealvalue", "grossmargin"]) {
        if (!cell(row, field)) throw new Error(`Row ${index + 2}: ${field} is required.`);
      }
      if (!cell(row, "id")) throw new Error(`Row ${index + 2}: id is required.`);
      const converted = cell(row, "converted").toLowerCase();
      if (!["true", "1", "yes", "won", "closed won", "false", "0", "no", "lost", "closed lost"].includes(converted)) {
        throw new Error(`Row ${index + 2}: converted must be a recognized won/lost value.`);
      }

      const candidate = {
        id: cell(row, "id") || `csv-${index + 1}`,
        createdAt: createdAt.toISOString(),
        region,
        segment,
        dealValue: numeric(cell(row, "deal value", "dealvalue", "value")),
        grossMargin: marginRaw > 1 ? marginRaw / 100 : marginRaw,
        converted: ["true", "1", "yes", "won", "closed won"].includes(
          cell(row, "converted").toLowerCase(),
        ),
        transcript: transcript || undefined,
        features: objection
          ? { ...features, primaryObjection: objection, extractor: "historical" as const }
          : features,
      };
      const checked = leadSchema.safeParse(candidate);
      if (!checked.success) throw new Error(`Row ${index + 2}: ${checked.error.issues[0].message}`);
      return checked.data;
    }),
  );
}

export const CSV_TEMPLATE = `id,created_at,region,segment,deal_value,gross_margin,converted,objection,transcript
lead-001,2026-07-14,Northeast,Mid-market,18000,0.42,true,cost,"The upfront price is the only blocker. Can you offer financing?"`;
