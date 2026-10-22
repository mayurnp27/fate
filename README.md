# Fate

**Test a revenue decision before you make it.**

Fate is a standalone scenario-planning prototype for comparing offers against historical sales outcomes. It combines an interactive website, a TypeScript simulation engine, and a local HTTP API. Explore financing, discounts, pilots, and implementation bundles while inspecting revenue, gross profit, uncertainty, evidence weighting, and assumptions.

No account, API key, hosted database, or CRM subscription is required.

## Quick start

Install **Node.js 24 or newer**, then:

```sh
git clone https://github.com/mayurnp27/fate.git
cd fate
npm ci
npm start
```

Open **http://localhost:3000**. Scroll to **Fate workbench**, keep **Synthetic demo** selected, and click **Run simulation**. To use your records, select **Your CSV** and choose a file matching the downloadable template.

The server listens on `127.0.0.1`. Set `PORT=3001 npm start` to change its port. Node may print an experimental SQLite warning; SQLite is included with Node and needs no separate installation.

## What is included

- The original scenario website, independently branded as Fate, with a self-contained browser demo.
- A full record-level engine with population filters, observed baseline economics, four offer definitions, and evidence-weighted scenario lift.
- 1,000 seeded Monte Carlo worlds per simulation, P10/P50/P90 intervals, sensitivity cases, and heuristic confidence scoring.
- Decision-readiness labels: abstain, exploratory, and directional.
- CSV ingestion and a deterministic keyword transcript extractor with a replaceable provider interface.
- Generated demo data and a synthetic benchmark covering 100 offers, 25 niches, and five sales cycles.
- An HTTP API, optional local SQLite result history, JSON export, and automated engine/API tests.

The website's aggregate slider demo is a separate illustrative model. The workbench calls the record-level engine through the API; results from those two interfaces are not expected to match. Introductory website cards are illustrative examples, not outputs from your imported data.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Server status |
| GET | `/api/offers` | Four fixed offer definitions |
| GET | `/api/template` | CSV template as `{ "csv": "..." }` |
| POST | `/api/import` | Validate and normalize `{ "csv": "..." }`; returns leads |
| POST | `/api/simulate` | Simulate a demo or supplied lead population |
| GET | `/api/simulations` | Most recent 20 explicitly saved results |

```sh
curl http://localhost:3000/api/simulate \
  -H 'Content-Type: application/json' \
  --data '{
    "demo": true,
    "offer": "financing",
    "scenario": "Offer financing to price-sensitive prospects",
    "filter": {"objection":"cost","region":"all","segment":"all","months":12},
    "now": "2026-08-28T12:00:00.000Z",
    "save": false
  }'
```

For actual records, replace `demo: true` with `leads: [...]` from `/api/import`. Supply exactly one data source. `now` is optional; pin it for repeatable analysis. Identical inputs produce identical numeric results and intervals; each run receives a fresh UUID. Responses include `baseline`, `simulated`, `deltas`, `distribution`, `sensitivity`, `confidence`, `decisionReadiness`, `evidenceBlend`, and assumptions.

Requests are limited to 2 MB and 2,000 leads. Unknown offer names, invalid records, duplicate IDs, future-dated records, and invalid filters are rejected. The API is stateless unless `save: true` is supplied.

## CSV format

Required columns: `id`, `created_at`, `deal_value`, `gross_margin`, `converted`.

Optional columns: `region`, `segment`, `objection`, `transcript`.

```csv
id,created_at,region,segment,deal_value,gross_margin,converted,objection,transcript
lead-001,2026-08-01,Northeast,SMB,12000,0.44,yes,cost,"Can we use financing?"
```

Dates must be parseable dates. Margins accept a fraction (`0.44`), percentage (`44%`), or percentage points (`44`). Use `true`, `1`, `yes`, `won`, or `closed won` for converted records and `false`, `0`, `no`, `lost`, or `closed lost` for unconverted records. Regions are `Northeast`, `Southeast`, `Midwest`, `West`, or `Unknown`; segments are `SMB`, `Mid-market`, `Enterprise`, or `Unknown`. Objections are `cost`, `timing`, `trust`, `authority`, `need`, or `none`.

Each row should represent a unique resolved opportunity in one consistent currency. Fate does not normalize currencies, resolve duplicates, or distinguish unresolved pipeline from resolved losses. Exclude unresolved records yourself. Labels derived from transcripts are keyword heuristics, not language-model extraction.

## Model and limitations

The baseline uses observed wins, the mean deal value among wins, and revenue-weighted historical gross margin. Scenario revenue changes with the offer's conversion lift and revenue multiplier; gross profit also applies its margin cost. Point conversions are rounded. Monte Carlo worlds sample baseline probability and uncertain lift, then simulated conversions.

Evidence weights shift toward company data as the cohort grows, but company fit is an observational heuristic. Industry priors are **unsourced prototype constants**, and synthetic evidence is generated test data. Neither establishes causal lift. Confidence is a heuristic score, not an empirical probability; without supplied experiment calibration, the engine caps it below High. The public API does not accept an experiment-calibration toggle or user-supplied priors.

An `abstain` result means evidence is insufficient for decision support. The workbench withholds scenario headline numbers in this state. The API and complete JSON retain diagnostic arithmetic; callers must honor `decisionReadiness` before displaying estimates. Generated demo runs are always labeled exploratory.

There are no live CRM connectors, LLM calls, autonomous sales agents, production authentication, causal evaluation, or outcome-learning service. Website descriptions of future collection/learning workflows are a product roadmap. Synthetic benchmarks test software behavior, not forecast accuracy. See [methodology](docs/methodology.md).

## Data and deployment

The website and API run on your computer. Import requests are not stored; saved results go to `.data/fate.sqlite` only when you choose to save. Saved JSON may contain your scenario text and assumptions. Do not add real customer data, transcripts, database files, `.env` files, or credentials to Git. `.gitignore` excludes local state. The website loads optional fonts from Google Fonts; the engine needs no external service.

This release is a **local, single-user prototype**, not an internet-facing service. The API binds to loopback and rejects other origins/hostnames. Deploying the API publicly requires authentication, tenant isolation, TLS, quotas, and a reviewed storage policy. Publishing this repository does not deploy a server. You can serve `site/` as a static website; its slider demo works, while the API workbench needs the included server.

## Development

```sh
npm run check   # TypeScript checks and engine/API tests
```

```text
site/             Independent website, aggregate demo, API workbench
src/engine/       Simulation, schemas, evidence, ingestion, synthetic fixtures
src/server.ts     HTTP API, static files, optional SQLite snapshots
tests/            Engine regression and API integration tests
docs/             Methodology and architecture notes
examples/         Synthetic-only request example
```

The engine is plain TypeScript. Import `simulateOffer`, `OFFER_LIBRARY`, and the validation schemas directly to embed it elsewhere. Run the source on Node 24, which strips TypeScript types natively. No build step is required.
