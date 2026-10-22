# Valmo-SAVE Resale Predictor

## https://valmo-save-predictor.vercel.app

A one-page website that demonstrates the Valmo-SAVE model. Enter a returned product and the hub where its delivery
failed; the model on the server predicts the chance that a buyer within 70 km orders it within the holding window,
and decides **hold at the hub** or **return to the seller**.

## What the page shows

| Output | Meaning |
|---|---|
| Decision | HOLD if the lowest expected cost of holding is below ₹170, otherwise RETURN |
| Resale chance | P(sold by the recommended day), or by day 21 if the model says return |
| Saving per unit, expected cost | ₹170 minus the expected cost of holding |
| 50% sold by, holding pays from | Median sale day; first day holding beats ₹170 |
| Local demand | Predicted orders per month for this product within 70 km of the hub |
| Stock cap | Most units of this product worth holding at once (k-th unit rule) |
| Chart | Chance of resale by day held against the chance needed to beat ₹170 |

## The model

`api/valmo_model.py` is the prediction path of the engine run in `Prediction_Model.ipynb` (`SalvageEngine.recommend`),
using the trained parameters exported from that engine into `api/model_bundle.npz` (2.5 MB) and
`api/model_bundle_meta.json`. Nothing is re-trained or simplified on the server:

- **Demand:** Gamma–Poisson empirical Bayes rate per product over every order within 70 km of the hub, with a recency half-life of 30 days (α 5, φ 0.5, β 10, tuned on the validation window)
- **Curve:** `P(t) = 1 − (1 + λt/k)^−k`, recalibrated with the cumulative-hazard map fitted on recent outcomes
- **Policy:** `E[C](T) = 50 + 25 + 0.33 × E[days held] + 120 × (1 − P(T))` for T up to min(21 days, 45-day rule); hold if below ₹170

`tools/parity_test.py` checks the website model against the full notebook engine: on 600 product–hub pairs every
output field (decision, days, probabilities, costs, demand, stock cap) matches exactly.

## Run locally

```bash
pip install -r requirements.txt uvicorn
uvicorn api.index:app --port 8000
# open http://localhost:8000   (API docs at /api/docs)
```

## Deploy

**Vercel** (same as the other prototypes): import the repository, set the Root Directory to this folder, deploy.
`vercel.json` routes `/api/*` to the Python function and serves `public/` as the page. No environment variables.

**Any container host:** `docker build -t valmo-predictor . && docker run -p 8000:8000 valmo-predictor`.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/predict?product_id=…&hub_region=…` | Full prediction for one returned unit |
| `GET /api/products?q=…` | Products matching a category or product-ID prefix |
| `GET /api/hubs?q=…` | Hub zones matching a city name, or the hub for a 5-digit ZIP prefix |
| `GET /api/meta` | Model information, back-test summary and the example inputs |

## Re-exporting the model

After re-running the notebook, pickle the fitted engine (`model_eng`) and run:

```bash
python tools/export_bundle.py model_eng.pkl api/model_bundle.npz
python tools/parity_test.py model_eng.pkl
```

`tools/salvage_v2.py` is the engine module the notebook imports.

Data: public Olist (Brazil) e-commerce orders, used as a proxy for Meesho data. Team 52 Saints, IIT Kharagpur, Meesho DICE 3.0.
