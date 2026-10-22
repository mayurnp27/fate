# Methodology

Fate evaluates an offer on a filtered set of opportunity records. It is a transparent prototype, not an identified causal model.

1. Filter by creation date lookback, objection, region, and segment. The model has no exposure-date or resolution-date field.
2. Compute baseline conversions, revenue, and revenue-weighted gross margin from observed wins.
3. Blend a company-fit heuristic, offer-type industry prior, and synthetic prior. Company/industry/synthetic weights are 25/50/25 below 30 records, 50/35/15 through 100, and 70/25/5 above 100.
4. Multiply baseline close probability by one plus blended lift, cap it at 95%, and round expected conversions. Recompute revenue and gross profit with offer economics. The 95% cap can reduce a near-perfect baseline; inspect this edge case before interpreting deltas.
5. Run 1,000 seeded statistical worlds. Baseline probability uses a Beta(wins + 0.5, losses + 0.5) distribution; lift uses an assumed normal spread that narrows at cohort-size thresholds. Outcomes use binomial draws. Revenue and margin values otherwise remain fixed.
6. Report P10/P50/P90 intervals and lift sensitivity at 0.5×, 1×, and 1.5×. These are model-dependent ranges, not validated frequentist confidence intervals.
7. Assign a heuristic confidence score. Below 10 leads or two wins, the normal company-blend engine abstains. Below 30 leads, five wins, or score 50 it labels the run exploratory; otherwise directional. Demo runs are always exploratory. The synthetic-only library mode intentionally remains exploratory rather than applying the company-data abstention rule.

The engine computes diagnostic scenario values even when it abstains. Consumers must enforce readiness in their UI. The standalone workbench does so; raw JSON preserves the full calculation for inspection.

A hypothetical discount reduces revenue per won deal while holding margin percentage constant. This is an explicit prototype convention, not a fixed-cost accounting model. Financing and bundle costs reduce gross margin percentage. Deal-level offer eligibility informs aggregate fit; it does not assign treatment separately to eligible leads.

Random seeds incorporate scenario wording, offer ID, filter, and ordered lead IDs. Changing the scenario text or row order changes the seed. Numeric results remain reproducible for identical validated inputs and the same reference time. IDs are intentionally new for each result.

Known gaps include currency normalization, duplicate resolution beyond rejecting duplicate IDs at the API, time-to-close, fixed delivery costs, seasonality, rep effects, retention, interference, experiment assignment, calibration, and formal causal identification. Default industry priors are placeholders. Additional synthetic runs cannot validate real-world forecasting accuracy.
