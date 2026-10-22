# Graph Report - valmo-save-predictor  (2026-10-23)

## Corpus Check
- 5 files · ~12,811 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 140 nodes · 274 edges · 11 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]

## God Nodes (most connected - your core abstractions)
1. `SalvageEngine` - 27 edges
2. `run_all()` - 14 edges
3. `ValmoModel` - 12 edges
4. `policy_from_curve()` - 12 edges
5. `build_regions()` - 9 edges
6. `DemandModel` - 9 edges
7. `CostConfig` - 8 edges
8. `radius_sweep()` - 8 edges
9. `PoolDemandModel` - 7 edges
10. `Calibrator` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Valmo-SAVE prediction API (FastAPI). Deployed as one Vercel Python function; als` --uses--> `ValmoModel`  [INFERRED]
  api\index.py → api\valmo_model.py
- `Check the website's model against the notebook engine (salvage_v2 + trained pick` --uses--> `ValmoModel`  [INFERRED]
  tools\parity_test.py → api\valmo_model.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.24
Nodes (7): radius_sweep(), Re-run tuning + back-test with the resale radius set to each value (geography re, Day of first later order of the same product, by another customer, in the same r, Rolling recalibration for decisions made from time s: returns whose 30-day outco, region_labels(), run_all(), SalvageEngine

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (14): censored_loglik(), Dataset, day_or(), _effective_window(), EngineConfig, find_data_dir(), _kneedle(), load_olist() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (7): O1 — decision card for a returned unit., Maps rows / coordinates to regions., Resale pool of every hub: the ZIP areas in the hub's own state that lie within t, (Re)build the resale pools and holding caps from cfg — cheap; lets a sweep reuse, Days a returned unit may be held = min(holding-time cap, room left by Meesho's 4, RegionIndex, StatePools

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (6): Check the website's model against the notebook engine (salvage_v2 + trained pick, _haversine(), Valmo-SAVE v2.2 — inference for one returned (RTO) unit.  This is the prediction, Most units of this product worth holding at once (k-th unit rule, as product_reg, km between one point (radians) and arrays of points (radians) — same formula as, ValmoModel

### Community 4 - "Community 4"
Cohesion: 0.2
Nodes (7): CostConfig, policy_from_curve(), Saving per return if the holding cap were T = 1…K days (45-day rule still applie, F1 with state pools: every returned unit of a product held anywhere in a state c, Vectorised over leading dims. Returns T*, hold flag, cost, and the timing milest, F_n(t) = P(at least n eligible orders by day t): sale curve of the n-th unit in, All numbers are cells of FINANCIAL MODEL_VALMO SAVE.xlsx (sheet FINANCIAL_ANALYS

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (13): build_regions(), choose_eps(), circle_labels(), haversine_matrix(), km_curve(), O4 — P(sold by day t | radius R) for the area's top-20 products (pooled Kaplan–M, km between all pairs; inputs in radians., Discrete Kaplan–Meier: returns F(t) = P(sold by day t), t = 0..K, and Greenwood (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.31
Nodes (7): _hub(), hubs(), meta(), predict(), _product(), products(), Valmo-SAVE prediction API (FastAPI). Deployed as one Vercel Python function; als

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (4): DemandModel, PoolDemandModel, Three-level empirical Bayes demand rate  national → area (metro/town) → region (, Two-level empirical Bayes demand over the resale pool of a hub:          λ(p, po

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (4): Calibrator, F4 — daily re-decision. At the start of each holding day the unit's demand model, F3 — shape-preserving recalibration of the time-to-sale curve.     Cumulative ha, Calibrate a single-horizon probability (used for the 1-day hazard in F4).

### Community 9 - "Community 9"
Cohesion: 0.5
Nodes (4): cost_curve(), p_required(), Expected cost E[C](T) for T = 0..K given F[..., t] = P(sold by day t). E[C](0) =, Probability needed by day T for holding until T to beat 170: (25 + per_day·E[day

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (1): Export the trained Valmo-SAVE v2.2 engine (the notebook's `model_eng`) into a co

## Knowledge Gaps
- **36 isolated node(s):** `Valmo-SAVE v2.2 — inference for one returned (RTO) unit.  This is the prediction`, `km between one point (radians) and arrays of points (radians) — same formula as`, `Most units of this product worth holding at once (k-th unit rule, as product_reg`, `Export the trained Valmo-SAVE v2.2 engine (the notebook's `model_eng`) into a co`, `salvage_v2.py — Region-aware RTO local-salvage engine (Meesho DICE 3.0, team 52` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (2 nodes): `Export the trained Valmo-SAVE v2.2 engine (the notebook's `model_eng`) into a co`, `export_bundle.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `SalvageEngine` connect `Community 0` to `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 8`, `Community 9`?**
  _High betweenness centrality (0.321) - this node is a cross-community bridge._
- **Why does `predict()` connect `Community 6` to `Community 2`?**
  _High betweenness centrality (0.292) - this node is a cross-community bridge._
- **Why does `ValmoModel` connect `Community 3` to `Community 6`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ValmoModel` (e.g. with `Valmo-SAVE prediction API (FastAPI). Deployed as one Vercel Python function; als` and `Check the website's model against the notebook engine (salvage_v2 + trained pick`) actually correct?**
  _`ValmoModel` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Valmo-SAVE v2.2 — inference for one returned (RTO) unit.  This is the prediction`, `km between one point (radians) and arrays of points (radians) — same formula as`, `Most units of this product worth holding at once (k-th unit rule, as product_reg` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._