# Recovered historical simulation runs

These are the **original recorded outputs** of two synthetic benchmarks executed on August 28, 2026. They were recovered from the original development chat's command results, not regenerated with the current engine.

| Run | Input population | Offers tested | Positive gross-profit scenarios | Mean conversion-rate change | Sum of modeled gross-profit changes |
| --- | --- | --- | --- | --- | --- |
| [Record benchmark](records-50000.json) | 50,000 generated records | 100 | 62 | +3.918 percentage points | $939,510.91 |
| [Conversation benchmark](conversations-3600.json) | 3,600 generated conversations | 100 | 89 | +4.417 percentage points | $2,080,404.53 |

Both experiments covered 25 niches and five sales-cycle models. The conversation benchmark used 36 conversations per offer across three months. These coverage details are documented in the contemporaneous run report; the conversation output itself contains only `conversationCount`, summary metrics, and its top five rows.

The leading scenario in both outputs was cybersecurity flexible financing during the Business case stage:

- Record benchmark: 28 matching leads; modeled gross-profit change **+$103,663.18**; heuristic confidence **34**.
- Conversation benchmark: 36 matching leads; modeled gross-profit change **+$111,079.43**; heuristic confidence **35 / Low**.

The JSON files preserve the recorded field names and numeric precision. `averageConversionLift` is an absolute rate difference: multiply by 100 to express percentage points. `totalGrossProfitDelta` sums independent test cohorts; it is not one company's forecast, realized revenue, or an experimentally verified effect. All data behind these runs was synthetic.

## What was recovered

- Record benchmark: aggregate metrics and the **top 10** scenarios.
- Conversation benchmark: aggregate metrics and the **top 5** scenarios.
- [Provenance](provenance.json): original source chat, turn, and command-output identifiers, plus the start and completion times of the containing turns. These are turn timestamps, not exact execution timestamps. The private source conversation is not published.

The original commands printed summaries only. Full 100-result snapshots, per-run UUIDs, all input records, conversations, and browser/database simulation-history entries were **not recovered here**. These files do not claim otherwise and are not compatible with the API's complete `SimulationResult` history format. Do not seed them into the SQLite result-history table as if they were full snapshots.

The generator and engine have evolved since these runs. A current rerun may differ; it must be labeled as a new result rather than overwriting this historical record. The synthetic generator is available in `src/engine/synthetic.ts` for new experiments.
