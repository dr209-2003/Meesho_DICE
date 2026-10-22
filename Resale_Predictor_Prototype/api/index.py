"""Valmo-SAVE prediction API (FastAPI). Deployed as one Vercel Python function; also runs locally:
    uvicorn api.index:app --port 8000      → open http://localhost:8000
"""
import os
import re
import sys

import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from valmo_model import ValmoModel  # noqa: E402

model = ValmoModel()
B, META = model.b, model.meta
app = FastAPI(title="Valmo-SAVE resale predictor", docs_url="/api/docs", openapi_url="/api/openapi.json")

PIDS = np.array(META["product_id"])
CATS = np.array(META["category"])[B["prod_cat"].astype(int)]
ORDERS = B["product_orders"]
BY_ORDERS = np.argsort(-ORDERS, kind="stable")
HUB_NAMES = np.array(META["hub_name"])
HUB_ORDER = np.argsort(-B["hub_orders_per_day"], kind="stable")

EXAMPLES = [
    dict(label="Likely to resell", product_id="3fbc0ef745950c7932d5f2a446189725", hub_region=4),
    dict(label="Borderline", product_id="154e7e31ebfa092203795c972e5804a6", hub_region=4),
    dict(label="Send back", product_id="99a4788cb24856965c36a24e339b6058", hub_region=3090),
]


def _product(i):
    return dict(product_id=str(PIDS[i]), category=str(CATS[i]).replace("_", " "), orders=int(ORDERS[i]))


def _hub(r, via=None):
    d = dict(hub_region=int(r), name=str(HUB_NAMES[r]), state=META["hub_state"][r],
             orders_per_day=round(float(B["hub_orders_per_day"][r]), 2))
    if via:
        d["via"] = via
    return d


@app.get("/api/meta")
def meta():
    bt = META["backtest"]
    return dict(data_window=META["data_window"], params=META["params"], products=len(PIDS), hubs=len(HUB_NAMES),
                resale_radius_km=float(B["pool_radius_km"]), status_quo=float(B["status_quo"]),
                backtest=dict(returns=int(bt["returns"]), hold_rate=bt["hold_rate"],
                              resale_rate_on_hold=bt["resale_rate_on_hold"], saving_per_return=bt["saving_per_return"]),
                examples=[dict(e, product=_product(model.pid_of[e["product_id"]]), hub=_hub(e["hub_region"]))
                          for e in EXAMPLES])


@app.get("/api/products")
def products(q: str = "", limit: int = Query(12, le=50)):
    q = q.strip().lower().replace(" ", "_")
    if not q:
        idx = BY_ORDERS[:limit]
    else:
        hit = np.flatnonzero(np.char.startswith(PIDS, q) | (np.char.find(CATS, q) >= 0))
        idx = hit[np.argsort(-ORDERS[hit], kind="stable")][:limit]
    return [_product(i) for i in idx]


@app.get("/api/hubs")
def hubs(q: str = "", limit: int = Query(12, le=50)):
    q = q.strip()
    if re.fullmatch(r"\d{4,5}", q):                       # Brazilian ZIP prefix (first 5 digits of a CEP)
        r = model.region_of_zip(int(q))
        if r is None:
            return []
        i = model.zip_index[int(q)]
        return [_hub(r, via=f"ZIP {q} · {META['zip_city'][i].title()} ({META['zip_state'][i]})")]
    if not q:
        return [_hub(r) for r in HUB_ORDER[:limit]]
    norm = lambda s: s.lower().replace("ã", "a").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ç", "c")
    qn = norm(q)
    hit = [r for r in HUB_ORDER if qn in norm(HUB_NAMES[r])]
    return [_hub(r) for r in hit[:limit]]


@app.get("/api/predict")
def predict(product_id: str, hub_region: int):
    if product_id not in model.pid_of:
        raise HTTPException(404, "Unknown product ID")
    if not 0 <= hub_region < len(HUB_NAMES):
        raise HTTPException(404, "Unknown hub")
    out = model.recommend(product_id, hub_region)
    out["product"] = _product(model.pid_of[product_id])
    return out


# Local run: serve the page too (on Vercel, /public is served by the CDN)
PUBLIC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
if not os.environ.get("VERCEL") and os.path.isdir(PUBLIC):
    app.mount("/assets", StaticFiles(directory=PUBLIC), name="assets")

    @app.get("/")
    def index():
        return FileResponse(os.path.join(PUBLIC, "index.html"))
