"""
salvage_v2.py — Region-aware RTO local-salvage engine (Meesho DICE 3.0, team 52 Saints)
=====================================================================================

What it does
------------
For every returned (RTO) unit of product p that comes back to hub region r, the engine says
  * HOLD locally or RETURN to seller (RTS) now,
  * how long to hold (cost-optimal window T*),
  * the most likely sale day, the day a sale becomes more likely than not, the break-even day,
  * the chance it is resold by T*, the expected cost vs the INR 170 status quo,
  * how many units of p the hub should hold at most (stock cap),
  * which regions of the country sell p best (planning view).

Economics — exactly the financial model workbook (FINANCIAL MODEL_VALMO SAVE.xlsx)
  forward 50 (B4) · reverse 120 (B5) · status quo 170 (B6) · storage 10 per 30-day window (B7, B8)
  handling 15 + relabelling 2 + manpower 8 = 25 one-time (B9–B11) · transport flat, no per-km cost.
  resold on day k:            50 + 25 + (10/30)·k
  not resold within T days:   50 + 25 + (10/30)·T + 120      (→ 85 / 205 at T = 30, as in the workbook)

Pipeline
  1. Data      : Olist orders → demand events; a "return" is a delivered order whose clock starts at the
                 delivery attempt (when an RTO unit would be back at the hub).
  2. Areas     : DBSCAN on customer-ZIP centroids finds towns / metros. For each area the hub radius is
                 calculated from its own demand: R_min (smallest radius where holding beats 170 for the
                 area's top-20 products) and R_50 (radius where resale within 30 days ≥ 50 %).
  3. Regions   : areas wider than 2·R are split with complete-linkage clustering (max diameter 2·R).
                 A hub zone is where a returned unit is STORED (its LMDC catchment).
  3b. Pool     : the unit can be RESOLD to any buyer of the same product within 70 km of its hub
                 (resale_pool="radius", the default). 70 km = point of diminishing returns of the saving-vs-
                 radius curve averaged over all products/regions (65 km), top-20 products (70 km) and the
                 São Paulo metro (45 km); it stays inside the 100 km point where freight (+43 %) and transit
                 (+1.3 days) jump, and covers Delhi NCR's urban core + satellite ring. No state borders
                 (NCR spans Delhi, UP and Haryana). Alternatives: "state" (same state, state radius) and
                 "hub" (own hub zone only).
  3c. Time cap : a held unit waits at most 21 days (point of diminishing returns of the saving-vs-holding-
                 days curve: 21 d all products, 15 d top-20, 17 d São Paulo) AND never beyond Meesho's 45-day
                 lost-shipment rule: 45 − dispatch→delivery − NDR 3 − return lane − buffer 2 (per order).
  4. Demand    : Gamma–Poisson (empirical-Bayes) demand rate λ(p, pool) per product × resale pool, recency
                 weighted (half-life tuned), shrunk towards product-national-rate × region-share-of-category.
                 P(sold by day t) = 1 − (1 + λ t / k)^(−k)   (negative-binomial predictive).
  5. Calibrate : parametric cumulative-hazard map Λ_cal = e^a·Λ^b, refitted monthly on the last 90 days
                 whose outcomes are known (keeps the day-by-day curve smooth).
  6. Policy    : E[cost](T) for T = 0…min(21, 45-day room) → T*, HOLD iff E[cost](T*) < 170; k-th-unit stock cap.
  7. Backtest  : train < 2018-01-01 · tune/calibrate on Jan–Mar 2018 · test Apr–Jul 2018 with monthly
                 rolling refits; independent replay, daily re-decision replay (F4) and a capacity-aware
                 competition simulation (F1).

No information after a decision date is used to make that decision (tested).
"""
from __future__ import annotations

import json
import math
import os
import time
import warnings
from dataclasses import asdict, dataclass, field, replace
from typing import Optional

import numpy as np
import pandas as pd
from scipy.stats import nbinom
from sklearn.cluster import AgglomerativeClustering, DBSCAN
from sklearn.isotonic import IsotonicRegression
from sklearn.neighbors import BallTree

warnings.filterwarnings("ignore", category=RuntimeWarning)
EARTH_KM = 6371.0
BRAZIL_BBOX = dict(lat=(-34.0, 5.5), lon=(-74.0, -34.0))
REQUIRED_FILES = ["olist_orders_dataset.csv", "olist_order_items_dataset.csv", "olist_customers_dataset.csv",
                  "olist_geolocation_dataset.csv", "olist_products_dataset.csv",
                  "product_category_name_translation.csv"]


# =============================================================================
# 1. CONFIGURATION
# =============================================================================
@dataclass
class CostConfig:
    """All numbers are cells of FINANCIAL MODEL_VALMO SAVE.xlsx (sheet FINANCIAL_ANALYSIS)."""
    forward: float = 50.0          # B4  (flat for any distance)
    reverse: float = 120.0         # B5
    storage: float = 10.0          # B8  per unit for the holding window
    handling: float = 15.0         # B9
    relabelling: float = 2.0       # B10
    manpower: float = 8.0          # B11
    window_days: int = 30          # B7  holding window

    def __post_init__(self):
        for f in ("forward", "reverse", "storage", "handling", "relabelling", "manpower"):
            setattr(self, f, float(getattr(self, f)))

    @property
    def status_quo(self) -> float:            # B6 = 170
        return self.forward + self.reverse

    @property
    def one_time(self) -> float:              # 25
        return self.handling + self.relabelling + self.manpower

    @property
    def per_day(self) -> float:               # 10/30
        return self.storage / self.window_days

    @property
    def stop_hazard(self) -> float:           # keep holding while P(sale tomorrow) > this (0.28 %)
        return self.per_day / self.reverse

    def success_cost(self, day):              # 50 + 25 + per_day·day
        return self.forward + self.one_time + self.per_day * np.asarray(day, float)

    def failure_cost(self, T):                # 50 + 25 + per_day·T + 120
        return self.forward + self.one_time + self.per_day * np.asarray(T, float) + self.reverse

    def breakeven_flat(self) -> float:        # workbook P8 = 29.17 %
        s = self.success_cost(self.window_days)
        f = self.failure_cost(self.window_days)
        return float((f - self.status_quo) / (f - s))


# Equivalent-circle radius of each Brazilian state, r = sqrt(area / pi) (team table, areas in km²).
STATE_RADIUS_KM = {
    "SP": 281.4, "RJ": 118.1, "MG": 432.8, "RS": 292.7, "PR": 252.1, "SC": 174.4, "BA": 424.8, "GO": 329.6,
    "ES": 121.3, "PE": 177.3, "DF": 43.0, "CE": 218.1, "PA": 631.6, "MT": 537.3, "PB": 134.4, "MS": 337.6,
    "MA": 325.8, "AL": 94.2, "RN": 129.9, "SE": 83.7, "PI": 283.6, "TO": 297.9, "RO": 275.5, "AP": 213.7,
    "AM": 708.6, "RR": 267.8, "AC": 220.7}


@dataclass
class EngineConfig:
    max_days: int = 30
    # resale pool: where a held unit may be resold
    #   "radius" → any buyer within resale_radius_km of the hub (default 70 km; flat ₹50 intra-city delivery)
    #   "state"  → any buyer in the SAME state as the hub, within the state's radius (optionally pool_cap_km)
    #   "hub"    → only buyers inside the unit's own hub zone
    resale_pool: str = "radius"
    resale_radius_km: float = 70.0
    state_radius_km: dict = field(default_factory=lambda: dict(STATE_RADIUS_KM))
    pool_cap_km: Optional[float] = None   # "state" mode only: optional extra ceiling
    # holding-time cap: a held unit waits at most this many days (diminishing-returns point, see docstring)
    max_hold_days: int = 21
    # Meesho 45-day rule: an RTO not back at the seller within 45 days of dispatch is marked lost
    apply_lost_rule: bool = True
    lost_rule_days: float = 45.0
    ndr_days: float = 3.0               # re-attempt (NDR) window before the unit is declared RTO
    return_buffer_days: float = 2.0
    anchor_statuses: tuple = ("delivered",)
    demand_exclude_statuses: tuple = ("canceled", "unavailable")
    # time split
    train_end: str = "2018-01-01"
    val_end: str = "2018-04-01"
    # areas / radius
    eps_candidates_km: tuple = (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10)
    radius_grid_km: tuple = (1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 40, 50)
    area_top_products: int = 20
    area_min_returns: int = 50          # below this an area's radius comes from the density law
    launch_r50_max_km: float = 15.0     # launch class: resale ≥ 50 % within this radius
    r_cap_km: float = 25.0              # operational ceiling — REPLACE with Valmo hub zone (R_ops) when known
    r_floor_km: float = 2.0
    # demand model tuning grids (chosen on the validation window — not guessed)
    half_life_grid: tuple = (None, 15.0, 30.0, 45.0, 60.0, 120.0)
    alpha_grid: tuple = (0.25, 0.5, 1.0, 2.0, 5.0)
    phi_grid: tuple = (0.0, 0.5, 1.0, 2.0)
    beta_grid: tuple = (1.0, 10.0)
    # capacity / simulation
    recal_window_days: int = 90         # rolling recalibration: last 90 days with fully observed outcomes
    max_units: int = 15
    rto_rates: tuple = (0.05, 0.20, 0.40)
    n_sims: int = 5
    n_boot: int = 500
    seed: int = 0


# =============================================================================
# 2. DATA
# =============================================================================
@dataclass
class Dataset:
    E: pd.DataFrame
    products: pd.DataFrame
    categories: list
    zips: pd.DataFrame
    data_start: pd.Timestamp
    data_end: pd.Timestamp
    notes: dict = field(default_factory=dict)

    def days(self, ts) -> float:
        return (pd.Timestamp(ts) - self.data_start) / pd.Timedelta(days=1)

    def ts(self, d) -> pd.Timestamp:
        return self.data_start + pd.Timedelta(days=float(d))


def haversine_matrix(lat1, lon1, lat2, lon2):
    """km between all pairs; inputs in radians."""
    dlat = lat2[None, :] - lat1[:, None]
    dlon = lon2[None, :] - lon1[:, None]
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1)[:, None] * np.cos(lat2)[None, :] * np.sin(dlon / 2) ** 2
    return 2 * EARTH_KM * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def _effective_window(ts: pd.Series, rel=0.4, look=28):
    """Drop the sparse head/tail of the order stream (Olist: 3-month gap in 2016, collapse after 2018-08-23)."""
    c = ts.dt.floor("D").value_counts().sort_index()
    c = c.reindex(pd.date_range(c.index.min(), c.index.max(), freq="D"), fill_value=0)
    v = c.values
    start = next(c.index[i] for i in range(len(v) - look)
                 if (v[i + 1:i + 1 + look] > 0).all() and v[i] >= rel * np.median(v[i + 1:i + 1 + look]))
    end = None
    for i in range(len(v) - 1, look, -1):
        recent = np.median(v[i - look:i])
        if recent >= rel * np.median(v[max(0, i - 365):i]) and v[i] >= rel * recent:
            end = c.index[i] + pd.Timedelta(days=1)
            break
    return start, end


def find_data_dir(root: str) -> str:
    """Return the folder (searched recursively) that contains all required Olist CSVs."""
    for dirpath, _, files in os.walk(root):
        if all(f in files for f in REQUIRED_FILES):
            return dirpath
    missing = [f for f in REQUIRED_FILES]
    raise FileNotFoundError(f"Could not find all of {missing} under {root}")


def load_olist(data_dir: str, cfg: EngineConfig | None = None, verbose=True) -> Dataset:
    cfg = cfg or EngineConfig()
    rd = lambda f, **k: pd.read_csv(os.path.join(data_dir, f), **k)
    orders = rd("olist_orders_dataset.csv",
                usecols=["order_id", "customer_id", "order_status", "order_purchase_timestamp",
                         "order_delivered_carrier_date", "order_delivered_customer_date"],
                parse_dates=["order_purchase_timestamp", "order_delivered_carrier_date",
                             "order_delivered_customer_date"])
    items = rd("olist_order_items_dataset.csv", usecols=["order_id", "product_id", "price"])
    cust = rd("olist_customers_dataset.csv", usecols=["customer_id", "customer_unique_id",
                                                     "customer_zip_code_prefix", "customer_city", "customer_state"])
    geo = rd("olist_geolocation_dataset.csv", usecols=["geolocation_zip_code_prefix", "geolocation_lat",
                                                       "geolocation_lng"])
    prods = rd("olist_products_dataset.csv", usecols=["product_id", "product_category_name"])
    tr = rd("product_category_name_translation.csv", encoding="utf-8-sig")

    g = geo[geo.geolocation_lat.between(*BRAZIL_BBOX["lat"]) & geo.geolocation_lng.between(*BRAZIL_BBOX["lon"])]
    zxy = g.groupby("geolocation_zip_code_prefix")[["geolocation_lat", "geolocation_lng"]].median()
    zxy.columns = ["lat", "lon"]
    start, end = _effective_window(orders.order_purchase_timestamp)

    it = items.groupby(["order_id", "product_id"], as_index=False).agg(price=("price", "mean"))
    E = it.merge(orders, on="order_id").merge(cust, on="customer_id").join(zxy, on="customer_zip_code_prefix")
    n_raw = len(E)
    # ZIPs missing from the geolocation table → median coordinate of the customer's city
    cz = cust.join(zxy, on="customer_zip_code_prefix").dropna(subset=["lat"])
    city_xy = cz.groupby(["customer_city", "customer_state"])[["lat", "lon"]].median()
    miss = E.lat.isna()
    if miss.any():
        fb = E.loc[miss, ["customer_city", "customer_state"]].join(city_xy, on=["customer_city", "customer_state"])
        E.loc[miss, "lat"], E.loc[miss, "lon"] = fb.lat.values, fb.lon.values
    n_fallback = int(miss.sum() - E.lat.isna().sum())
    E = E[~E.order_status.isin(cfg.demand_exclude_statuses)]
    E = E[(E.order_purchase_timestamp >= start) & (E.order_purchase_timestamp < end)].dropna(subset=["lat", "lon"])
    E = E.copy()
    E["is_anchor"] = E.order_status.isin(cfg.anchor_statuses)

    pids = np.sort(E.product_id.unique())
    P = pd.DataFrame({"product_id": pids}).merge(prods, on="product_id", how="left")
    P["category"] = P.product_category_name.fillna("__unknown__")
    P["category_english"] = P.category.map(dict(zip(tr.iloc[:, 0], tr.iloc[:, 1]))).fillna(P.category)
    P["category_english"] = P.category_english.replace("__unknown__", "uncategorised")
    cats = sorted(P.category.unique())
    P["cat"] = pd.Categorical(P.category, categories=cats).codes
    E["pid"] = pd.Categorical(E.product_id, categories=pids).codes.astype(np.int32)
    E["cat"] = P.cat.values[E.pid.values]
    E["cust"] = pd.factorize(E.customer_unique_id)[0].astype(np.int64)
    E["t"] = (E.order_purchase_timestamp - start) / pd.Timedelta(days=1)
    lag = (E.order_delivered_customer_date - E.order_purchase_timestamp) / pd.Timedelta(days=1)
    lag = lag.where(lag >= 0)
    E["t_anchor"] = E.t + lag.fillna(lag[E.is_anchor].median())      # clock starts at the delivery attempt
    lane = (E.order_delivered_customer_date - E.order_delivered_carrier_date) / pd.Timedelta(days=1)
    lane = lane.where(lane >= 0)
    E["lane_days"] = lane.fillna(lane[E.is_anchor].median())          # dispatch → delivery attempt (this order's lane)
    E = E.sort_values(["pid", "t"], kind="mergesort").reset_index(drop=True)
    E = E[["order_id", "product_id", "pid", "cat", "cust", "customer_unique_id", "is_anchor", "t", "t_anchor",
           "order_purchase_timestamp", "customer_zip_code_prefix", "customer_city", "customer_state",
           "lat", "lon", "price", "lane_days"]]
    Z = (E.groupby("customer_zip_code_prefix")
         .agg(lat=("lat", "first"), lon=("lon", "first"),
              city=("customer_city", lambda s: s.mode().iloc[0]), state=("customer_state", lambda s: s.mode().iloc[0]))
         .reset_index().rename(columns={"customer_zip_code_prefix": "zip"}))
    notes = dict(rows_raw=n_raw, rows_used=len(E), geo_city_fallback_rows=n_fallback, data_start=str(start.date()),
                 data_end_exclusive=str(end.date()), products=len(P), categories=len(cats), zip_prefixes=len(Z),
                 returns_pseudo=int(E.is_anchor.sum()),
                 median_delivery_lag_days=float(np.nanmedian(lag)))
    if verbose:
        print(f"[data] {start.date()} → {end.date()} | {len(E):,} order-lines | {int(E.is_anchor.sum()):,} "
              f"pseudo-returns | {len(P):,} products | {len(Z):,} ZIP prefixes")
    return Dataset(E=E, products=P, categories=cats, zips=Z, data_start=start, data_end=end, notes=notes)


# =============================================================================
# 3. SURVIVAL HELPERS
# =============================================================================
def km_curve(dur: np.ndarray, event: np.ndarray, K: int):
    """Discrete Kaplan–Meier: returns F(t) = P(sold by day t), t = 0..K, and Greenwood SE."""
    S, var_sum, F, SE = 1.0, 0.0, [0.0], [0.0]
    for d in range(1, K + 1):
        n = (dur >= d).sum()
        e = ((dur == d) & event).sum()
        if n > 0:
            h = e / n
            S *= 1 - h
            if n > e:
                var_sum += e / (n * (n - e))
        F.append(1 - S)
        SE.append(S * math.sqrt(var_sum))
    return np.array(F), np.array(SE)


def cost_curve(F: np.ndarray, cc: CostConfig):
    """Expected cost E[C](T) for T = 0..K given F[..., t] = P(sold by day t). E[C](0) = 170."""
    S = 1.0 - F
    EH = np.concatenate([np.zeros(S.shape[:-1] + (1,)), np.cumsum(S[..., :-1], axis=-1)], axis=-1)
    C = cc.forward + cc.one_time + cc.per_day * EH + cc.reverse * S
    C[..., 0] = cc.status_quo
    return C, EH


def policy_from_curve(F: np.ndarray, cc: CostConfig, margin: float = 0.0, cap=None) -> dict:
    """Vectorised over leading dims. Returns T*, hold flag, cost, and the timing milestones.
    cap: optional maximum holding days per unit (45-day lost rule); days beyond it are not allowed."""
    C, EH = cost_curve(F, cc)
    K = F.shape[-1] - 1
    if cap is not None:
        cap = np.asarray(cap, float)
        capb = cap.reshape(cap.shape + (1,) * (F.ndim - cap.ndim))
        tt = np.arange(K + 1)
        C = np.where((tt > capb) & (tt > 0), np.inf, C)
    T = C.argmin(-1)
    cmin = np.take_along_axis(C, T[..., None], -1)[..., 0]
    hold = (T > 0) & (cmin < cc.status_quo - margin)
    below = (C[..., 1:] < cc.status_quo)
    be_day = np.where(below.any(-1), below.argmax(-1) + 1, -1)
    daily = np.diff(F, axis=-1)
    likely = daily.argmax(-1) + 1
    med = np.where((F >= 0.5).any(-1), (F >= 0.5).argmax(-1), -1)
    PT = np.take_along_axis(F, T[..., None], -1)[..., 0]
    return dict(T=np.where(hold, T, 0), hold=hold, cost=np.where(hold, cmin, cc.status_quo),
                cost_if_held=cmin, P_T=np.where(hold, PT, 0.0), breakeven_day=be_day, likely_day=likely,
                median_day=med, C=C)


def p_required(F: np.ndarray, cc: CostConfig):
    """Probability needed by day T for holding until T to beat 170: (25 + per_day·E[days held]) / 120."""
    _, EH = cost_curve(F, cc)
    return (cc.one_time + cc.per_day * EH) / (cc.reverse - 0.0)


# =============================================================================
# 4. AREAS, RADIUS, REGIONS
# =============================================================================
def circle_labels(E: pd.DataFrame, anchor_mask: np.ndarray, censor_t: float, radii, K: int,
                  row_state: np.ndarray | None = None, anchor_state: np.ndarray | None = None):
    """For each anchor: first later order of the same product by another customer within R km (all R at once).
    With row_state / anchor_state (per E row), only buyers in the anchor's state count (intra-state resale)."""
    rad = np.asarray(radii, float)
    pid, t, tA, cust = E.pid.values, E.t.values, E.t_anchor.values, E.cust.values
    lat, lon = np.radians(E.lat.values), np.radians(E.lon.values)
    A_all = np.flatnonzero(anchor_mask)
    gap = np.full((len(A_all), len(rad)), np.inf)
    pos = {a: i for i, a in enumerate(A_all)}
    usable = t < censor_t
    up = np.unique(pid[A_all])
    starts = np.searchsorted(pid, up, side="left")
    ends = np.searchsorted(pid, up, side="right")
    for s, e in zip(starts, ends):
        A = np.arange(s, e)[anchor_mask[s:e]]
        if len(A) == 0:
            continue
        C = np.arange(s, e)[usable[s:e]]
        for b in range(0, len(A), 2000):
            Ab = A[b:b + 2000]
            D = haversine_matrix(lat[Ab], lon[Ab], lat[C], lon[C])
            dt = t[C][None, :] - tA[Ab][:, None]
            ok = (dt > 0) & (cust[C][None, :] != cust[Ab][:, None])
            if row_state is not None:
                ok &= row_state[C][None, :] == anchor_state[Ab][:, None]
            idx = np.array([pos[a] for a in Ab])
            for r, R in enumerate(rad):
                g = np.where(ok & (D <= R), dt, np.inf).min(1)
                gap[idx, r] = g
    ta = tA[A_all]
    obs = np.floor(np.clip(np.minimum(censor_t - ta, K), 0, None)).astype(int)
    ev = np.isfinite(gap) & (gap <= K)
    day = np.where(ev, np.clip(np.ceil(gap), 1, K), 0).astype(int)
    dur = np.where(ev, day, obs[:, None])
    return A_all, day, dur, ev


def choose_eps(Z: pd.DataFrame, cands) -> tuple[float, pd.DataFrame]:
    """eps = knee of the 'number of DBSCAN clusters vs eps' curve (Kneedle on normalised axes)."""
    X = np.radians(Z[["lat", "lon"]].values)
    n = np.array([DBSCAN(eps=e / EARTH_KM, min_samples=1, metric="haversine").fit_predict(X).max() + 1
                  for e in cands])
    x = (np.array(cands) - cands[0]) / (cands[-1] - cands[0])
    y = (n - n.min()) / (n.max() - n.min())
    d = (1 - x) - y                          # distance below the chord of a decreasing convex curve
    k = int(np.argmax(d))
    return float(cands[k]), pd.DataFrame(dict(eps_km=cands, clusters=n))


def _top_city(zs: pd.DataFrame) -> str:
    """Name = city with the most training orders in the group."""
    c = zs.groupby(["city", "state"]).orders_train.sum().idxmax()
    return f"{c[0].title()} ({c[1]})"


def build_regions(ds: Dataset, cfg: EngineConfig, cc: CostConfig, fit_end: float, verbose=True):
    """Areas (DBSCAN) → per-area radius from the area's own demand → regions (complete-linkage, diameter ≤ 2R)."""
    E, Z = ds.E, ds.zips.copy()
    K = cfg.max_days
    tr = E.t.values < fit_end
    span = fit_end
    zi = {z: i for i, z in enumerate(Z.zip)}
    row_zip = E.customer_zip_code_prefix.map(zi).values
    Z["orders_train"] = np.bincount(row_zip[tr], minlength=len(Z))
    eps, eps_table = choose_eps(Z, cfg.eps_candidates_km)
    X = np.radians(Z[["lat", "lon"]].values)
    Z["area"] = DBSCAN(eps=eps / EARTH_KM, min_samples=1, metric="haversine").fit_predict(X)
    row_area = Z.area.values[row_zip]

    # ---- radius analysis per data-rich area -----------------------------------------------
    radii = list(cfg.radius_grid_km)
    area_orders = pd.Series(Z.orders_train.values).groupby(Z.area.values).sum()
    rows, curves = [], []
    for a in area_orders.sort_values(ascending=False).index:
        if area_orders[a] < cfg.area_min_returns:
            break
        inA = (row_area == a)
        top = pd.Series(E.pid.values[inA & tr]).value_counts().index[:cfg.area_top_products]
        m = E.is_anchor.values & inA & np.isin(E.pid.values, top) & (E.t_anchor.values < fit_end)
        if m.sum() < cfg.area_min_returns:
            continue
        _, day, dur, ev = circle_labels(E, m, fit_end, radii, K)
        F = np.array([km_curve(dur[:, i], ev[:, i], K)[0] for i in range(len(radii))])
        pol = policy_from_curve(F, cc)
        best = pol["cost_if_held"].copy()
        best[~(pol["T"] > 0)] = np.minimum(best[~(pol["T"] > 0)], cc.status_quo)
        pays = np.flatnonzero(pol["hold"])
        r50 = np.flatnonzero(F[:, K] >= 0.5)
        R_min = radii[pays[0]] if len(pays) else np.nan
        R_50 = radii[r50[0]] if len(r50) else np.nan
        zs = Z[Z.area == a]
        name = _top_city(zs)
        rows.append(dict(area=a, name=name, orders_per_day=area_orders[a] / span, returns_top=int(m.sum()),
                         R_min=R_min, R_50=R_50, zips=len(zs)))
        for i, R in enumerate(radii):
            curves.append(dict(area=a, name=name, radius_km=R, P30=F[i, K], P7=F[i, 7], best_cost=best[i],
                               T_star=int(pol["T"][i])))
    A = pd.DataFrame(rows)
    # ---- class + operating radius ----------------------------------------------------------
    def classify(r):
        if np.isfinite(r.R_50) and r.R_50 <= cfg.launch_r50_max_km:
            return "launch", r.R_50
        if np.isfinite(r.R_min) and r.R_min <= cfg.r_cap_km:
            return "marginal", r.R_min
        return "not viable", cfg.r_cap_km
    cls = A.apply(classify, axis=1, result_type="expand") if len(A) else pd.DataFrame(columns=[0, 1])
    A["class"], A["R_area"] = cls[0], cls[1]
    # ---- density law for data-poor areas (fitted, not assumed) ------------------------------
    ok = A[np.isfinite(A.R_min)]
    slope, icpt = np.polyfit(np.log(ok.orders_per_day), np.log(ok.R_min), 1) if len(ok) >= 3 else (-0.5, np.log(10))
    all_areas = pd.DataFrame(dict(area=area_orders.index, orders_per_day=area_orders.values / span))
    all_areas = all_areas.merge(A.drop(columns="orders_per_day"), on="area", how="left")
    poor = all_areas.R_area.isna()
    pred = np.exp(icpt + slope * np.log(np.maximum(all_areas.orders_per_day[poor], 1e-3)))
    all_areas.loc[poor, "R_area"] = np.clip(pred, cfg.r_floor_km, cfg.r_cap_km)
    all_areas.loc[poor, "class"] = "data-poor (density law)"
    R_of_area = dict(zip(all_areas.area, all_areas.R_area))

    # ---- split areas wider than 2R with complete linkage --------------------------------------
    region = np.full(len(Z), -1)
    nxt = 0
    for a, idx in Z.groupby("area").groups.items():
        idx = np.asarray(idx)
        Dcap = 2 * R_of_area[a]
        if len(idx) == 1:
            region[idx] = nxt; nxt += 1; continue
        M = haversine_matrix(X[idx, 0], X[idx, 1], X[idx, 0], X[idx, 1])
        if M.max() <= Dcap:
            region[idx] = nxt; nxt += 1; continue
        lab = AgglomerativeClustering(n_clusters=None, metric="precomputed", linkage="complete",
                                      distance_threshold=Dcap).fit_predict(M)
        region[idx] = lab + nxt
        nxt += lab.max() + 1
    Z["region"] = region
    # ---- region table ------------------------------------------------------------------------
    w = Z.orders_train.values + 1e-9
    R = (Z.assign(w=w, wlat=Z.lat * w, wlon=Z.lon * w)
         .groupby("region").agg(area=("area", "first"), zips=("zip", "size"), orders_train=("orders_train", "sum"),
                                wlat=("wlat", "sum"), wlon=("wlon", "sum"), w=("w", "sum")))
    R["lat"], R["lon"] = R.wlat / R.w, R.wlon / R.w
    R = R.drop(columns=["wlat", "wlon", "w"]).reset_index()
    nm = {r: _top_city(g) for r, g in Z.groupby("region")}
    R["name"] = R.region.map(nm)
    dup = R.groupby("name").region.transform("count") > 1
    R.loc[dup, "name"] = R.loc[dup, "name"] + " #" + (R[dup].groupby("name").cumcount() + 1).astype(str)
    R["orders_per_day"] = R.orders_train / span
    diam = []
    for r, idx in Z.groupby("region").groups.items():
        idx = np.asarray(idx)
        if len(idx) < 2:
            diam.append(0.0); continue
        sub = idx if len(idx) <= 2500 else np.random.default_rng(0).choice(idx, 2500, replace=False)
        diam.append(float(haversine_matrix(X[sub, 0], X[sub, 1], X[sub, 0], X[sub, 1]).max()))
    R["diameter_km"] = diam
    R = R.merge(all_areas[["area", "R_area", "class"]], on="area", how="left")
    R = R.merge(A[["area", "name"]].rename(columns={"name": "area_name"}), on="area", how="left")
    R = R.sort_values("region").reset_index(drop=True)
    assert (R.region.values == np.arange(len(R))).all()
    C = pd.DataFrame(curves)
    info = dict(eps_km=eps, eps_table=eps_table, density_law=dict(slope=float(slope), intercept=float(icpt)),
                n_areas=int(Z.area.nunique()), n_regions=int(nxt))
    if verbose:
        print(f"[regions] eps={eps} km (knee) | {info['n_areas']:,} areas | {len(A)} data-rich areas | "
              f"{nxt:,} regions | max diameter {R.diameter_km.max():.1f} km | "
              f"density law R_min ∝ density^{slope:.2f}")
    return Z, R, all_areas, C, info


class RegionIndex:
    """Maps rows / coordinates to regions."""

    def __init__(self, Z: pd.DataFrame, R: pd.DataFrame):
        self.Z, self.R = Z, R
        self.zip2reg = dict(zip(Z.zip, Z.region))
        self.tree = BallTree(np.radians(Z[["lat", "lon"]].values), metric="haversine")

    def of_rows(self, E):
        return E.customer_zip_code_prefix.map(self.zip2reg).values.astype(int)

    def of_point(self, lat, lon):
        _, i = self.tree.query(np.radians([[lat, lon]]), k=1)
        return int(self.Z.region.values[i[0, 0]])


# =============================================================================
# 5. REGION LABELS (realised outcomes)
# =============================================================================
def region_labels(E: pd.DataFrame, reg: np.ndarray, anchor_mask: np.ndarray, censor_t: float, K: int):
    """Day of first later order of the same product, by another customer, in the same region (0 = none)."""
    key = E.pid.values.astype(np.int64) * (reg.max() + 1) + reg
    order = np.lexsort((E.t.values, key))
    ks, ts, cs = key[order], E.t.values[order], E.cust.values[order]
    u, st = np.unique(ks, return_index=True)
    en = np.r_[st[1:], len(ks)]
    gidx = dict(zip(u, range(len(u))))
    A = np.flatnonzero(anchor_mask)
    tA = E.t_anchor.values[A]
    gap = np.full(len(A), np.inf)
    for i, a in enumerate(A):
        g = gidx[key[a]]
        lo, hi = st[g], en[g]
        j = lo + np.searchsorted(ts[lo:hi], tA[i], side="right")
        while j < hi and cs[j] == E.cust.values[a]:
            j += 1
        if j < hi and ts[j] < censor_t:
            gap[i] = ts[j] - tA[i]
    obs = np.floor(np.clip(np.minimum(censor_t - tA, K), 0, None)).astype(int)
    ev = np.isfinite(gap) & (gap <= K)
    day = np.where(ev, np.clip(np.ceil(gap), 1, K), 0).astype(int)
    dur = np.where(ev, day, obs)
    return A, day, dur, ev


# =============================================================================
# 6. DEMAND MODEL (Gamma–Poisson, recency-weighted, empirical Bayes)
# =============================================================================
class DemandModel:
    """Three-level empirical Bayes demand rate  national → area (metro/town) → region (hub zone):
         λ(p, area)   ~ Gamma posterior, prior mean λ_p(national) × share_area(category)
         λ(p, region) ~ Gamma posterior, prior mean λ(p, area)   × share_region|area(category)
       P(sold by day t) = 1 − (1 + λ̂ t / k)^(−k),  k = 1 / (1/a + φ)  (parameter + intrinsic over-dispersion)."""

    def __init__(self, half_life=None, alpha=1.0, phi=0.0, beta=10.0):
        self.H, self.alpha, self.phi, self.beta = half_life, alpha, phi, beta

    def fit(self, E: pd.DataFrame, reg: np.ndarray, n_regions: int, n_products: int, n_cats: int,
            prod_cat: np.ndarray, ref_t: float, area_of_region: np.ndarray | None = None):
        m = E.t.values < ref_t
        age = ref_t - E.t.values[m]
        w = np.ones(m.sum()) if self.H is None else 0.5 ** (age / self.H)
        span = ref_t
        self.Ew = span if self.H is None else self.H / math.log(2) * (1 - 0.5 ** (span / self.H))
        p, r, c = E.pid.values[m], reg[m], E.cat.values[m]
        self.nR = n_regions
        self.n_pr = pd.Series(w).groupby(p.astype(np.int64) * n_regions + r).sum()
        self.n_p = np.bincount(p, weights=w, minlength=n_products)
        n_cr = pd.Series(w).groupby(c.astype(np.int64) * n_regions + r).sum()
        n_c = np.bincount(c, weights=w, minlength=n_cats)
        n_r = np.bincount(r, weights=w, minlength=n_regions)
        self.share_all = n_r / n_r.sum()
        self.n_cr, self.n_c = n_cr, n_c
        self.prod_cat = prod_cat
        self.ref_t = ref_t
        # area level
        self.aor = np.zeros(n_regions, np.int64) if area_of_region is None else np.asarray(area_of_region, np.int64)
        self.nA = int(self.aor.max()) + 1
        ar = self.aor[r]
        self.n_pa = pd.Series(w).groupby(p.astype(np.int64) * self.nA + ar).sum()
        self.n_ca = pd.Series(w).groupby(c.astype(np.int64) * self.nA + ar).sum()
        n_a = np.bincount(ar, weights=w, minlength=self.nA)
        self.share_area = n_a / n_a.sum()
        self.share_r_in_a = n_r / np.maximum(n_a[self.aor], 1e-12)
        return self

    def params(self, pid: np.ndarray, region: np.ndarray):
        pid, region = np.asarray(pid, np.int64), np.asarray(region, np.int64)
        key = pid * self.nR + region
        n = self.n_pr.reindex(key).fillna(0.0).values
        c = self.prod_cat[pid].astype(np.int64)
        ar = self.aor[region]
        # level 1: product in area
        nca = self.n_ca.reindex(c * self.nA + ar).fillna(0.0).values
        s_a = (nca + self.beta * self.share_area[ar]) / (self.n_c[c] + self.beta)
        mu_a = self.n_p[pid] / self.Ew * s_a
        n_pa = self.n_pa.reindex(pid * self.nA + ar).fillna(0.0).values
        with np.errstate(divide="ignore", invalid="ignore"):
            lam_a = np.where(mu_a > 0, (n_pa + self.alpha) / (self.Ew + self.alpha / mu_a), 0.0)
        # level 2: region within area (category-specific share, smoothed to the region's share of all area demand)
        ncr = self.n_cr.reindex(c * self.nR + region).fillna(0.0).values
        share = (ncr + self.beta * self.share_r_in_a[region]) / (nca + self.beta)
        mu = lam_a * share
        a = n + self.alpha
        with np.errstate(divide="ignore", invalid="ignore"):
            b = np.where(mu > 0, self.Ew + self.alpha / mu, np.inf)
            lam = np.where(np.isfinite(b), a / b, 0.0)
        k = 1.0 / (1.0 / a + self.phi)
        return lam, k, n, mu

    def curve(self, pid, region, K=30):
        lam, k, n, mu = self.params(pid, region)
        t = np.arange(K + 1)[None, :]
        F = 1 - (1 + lam[:, None] * t / k[:, None]) ** (-k[:, None])
        return F, lam, k, n

    def unit_curve(self, pid, region, units: int, K=30):
        """F_n(t) = P(at least n eligible orders by day t): sale curve of the n-th unit in the queue."""
        lam, k, n, mu = self.params(pid, region)
        t = np.arange(K + 1)[None, :]
        p = k[:, None] / (k[:, None] + lam[:, None] * t)          # NB(k, p): mean = λ t
        out = np.zeros((len(lam), units, K + 1))
        for u in range(1, units + 1):
            out[:, u - 1, :] = 1 - nbinom.cdf(u - 1, k[:, None], p)
        return np.nan_to_num(out)


# =============================================================================
# 6b. RESALE POOL = SAME STATE, WITHIN THE STATE RADIUS OF THE HUB
# =============================================================================
class StatePools:
    """Resale pool of every hub: the ZIP areas in the hub's own state that lie within that state's radius
    of the hub (optionally also within pool_cap_km). Intra-state delivery is the flat ₹50 leg of the workbook;
    buyers in another state are never matched (inter-state transfer is costly)."""

    def __init__(self, Z: pd.DataFrame, R: pd.DataFrame, radius_km: dict, cap_km: float | None = None,
                 default_km: float = 100.0):
        R = R.set_index("region").loc[np.arange(len(R))].reset_index()
        zz = Z.assign(w=Z.orders_train.astype(float) + 1e-3)
        hs = (zz.groupby(["region", "state"]).w.sum().reset_index().sort_values("w")
              .drop_duplicates("region", keep="last").set_index("region").state)
        self.states = sorted(set(Z.state) | set(hs.values))
        code = {st: i for i, st in enumerate(self.states)}
        self.hub_state = hs.reindex(R.region).values
        self.hub_state_code = np.array([code[x] for x in self.hub_state])
        self.zip_state_code = np.array([code[x] for x in Z.state.values])
        self.radius = {st: float(min(radius_km.get(st, default_km), cap_km) if cap_km else radius_km.get(st, default_km))
                       for st in self.states}
        self.radius_by_code = np.array([self.radius[st] for st in self.states])
        self.hub_local = np.full(len(R), -1)
        self.zip_local = np.full(len(Z), -1)
        self.Mc, self.HH, self.hubs, self.zips = {}, {}, {}, {}
        hla, hlo = np.radians(R.lat.values), np.radians(R.lon.values)
        zla, zlo = np.radians(Z.lat.values), np.radians(Z.lon.values)
        for st in self.states:
            c = code[st]
            h = np.flatnonzero(self.hub_state_code == c)
            z = np.flatnonzero(self.zip_state_code == c)
            self.hub_local[h] = np.arange(len(h))
            self.zip_local[z] = np.arange(len(z))
            rad = self.radius[st]
            self.Mc[c] = haversine_matrix(hla[h], hlo[h], zla[z], zlo[z]) <= rad if len(h) and len(z) else \
                np.zeros((len(h), len(z)), bool)
            self.HH[c] = haversine_matrix(hla[h], hlo[h], hla[h], hlo[h]) <= rad if len(h) else np.zeros((0, 0), bool)
            self.hubs[c], self.zips[c] = h, z
        self.cap_km = cap_km

    def describe(self, region: int) -> str:
        st = self.hub_state[region]
        if st == "ALL":                       # uniform-radius pool (no state borders)
            return f"any buyer within {self.radius[st]:.0f} km of the hub"
        return f"{st} state, within {self.radius[st]:.0f} km of the hub"

    def pool_zip_mask(self, region: int) -> np.ndarray:
        c = self.hub_state_code[region]
        m = np.zeros(len(self.zip_state_code), bool)
        m[self.zips[c][self.Mc[c][self.hub_local[region]]]] = True
        return m


def pool_labels(E: pd.DataFrame, reg: np.ndarray, zrow: np.ndarray, pools: StatePools, anchor_mask: np.ndarray,
                censor_t: float, K: int):
    """Day of the first later order of the same product, by another customer, inside the unit's resale pool."""
    pid, t, tA, cust = E.pid.values, E.t.values, E.t_anchor.values, E.cust.values
    A_all = np.flatnonzero(anchor_mask)
    gap = np.full(len(A_all), np.inf)
    usable = t < censor_t
    zst = pools.zip_state_code[zrow]
    hst = pools.hub_state_code[reg]
    up = np.unique(pid[A_all])
    starts = np.searchsorted(pid, up, side="left")
    ends = np.searchsorted(pid, up, side="right")
    pos0 = np.searchsorted(A_all, starts)
    for s, e, p0 in zip(starts, ends, pos0):
        if e - s < 2:
            continue
        A = s + np.flatnonzero(anchor_mask[s:e])
        C = s + np.flatnonzero(usable[s:e])
        if len(C) == 0:
            continue
        dt = t[C][None, :] - tA[A][:, None]
        ok = (dt > 0) & (cust[C][None, :] != cust[A][:, None])
        sa, sc = hst[A], zst[C]
        mem = np.zeros(ok.shape, bool)
        for st in np.unique(sa):
            ia, jc = np.flatnonzero(sa == st), np.flatnonzero(sc == st)
            if len(jc):
                mem[np.ix_(ia, jc)] = pools.Mc[st][np.ix_(pools.hub_local[reg[A[ia]]], pools.zip_local[zrow[C[jc]]])]
        g = np.where(ok & mem, dt, np.inf).min(1)
        gap[p0:p0 + len(A)] = g
    obs = np.floor(np.clip(np.minimum(censor_t - tA[A_all], K), 0, None)).astype(int)
    ev = np.isfinite(gap) & (gap <= K)
    day = np.where(ev, np.clip(np.ceil(gap), 1, K), 0).astype(int)
    dur = np.where(ev, day, obs)
    return A_all, day, dur, ev


class PoolDemandModel(DemandModel):
    """Two-level empirical Bayes demand over the resale pool of a hub:
         λ(p, pool) ~ Gamma posterior with prior mean  λ_p(national) × share_pool(category)
       where the pool is the hub's state within the state radius. Same hyper-parameters (half-life, α, φ, β)
       and the same negative-binomial predictive  P(sold by t) = 1 − (1 + λ t / k)^(−k)."""

    def fit(self, E: pd.DataFrame, reg: np.ndarray, n_regions: int, n_products: int, n_cats: int,
            prod_cat: np.ndarray, ref_t: float, pools: StatePools, zrow: np.ndarray, area_of_region=None):
        m = E.t.values < ref_t
        age = ref_t - E.t.values[m]
        w = np.ones(m.sum()) if self.H is None else 0.5 ** (age / self.H)
        self.Ew = ref_t if self.H is None else self.H / math.log(2) * (1 - 0.5 ** (ref_t / self.H))
        p, r, c, z = E.pid.values[m], reg[m], E.cat.values[m], zrow[m]
        self.nR, self.ref_t, self.prod_cat, self.pools = n_regions, ref_t, prod_cat, pools
        self.n_pr = pd.Series(w).groupby(p.astype(np.int64) * n_regions + r).sum()   # hub-level evidence (keys)
        self.n_p = np.bincount(p, weights=w, minlength=n_products)
        self.n_c = np.bincount(c, weights=w, minlength=n_cats)
        ZC = np.zeros((len(pools.zip_state_code), n_cats))
        np.add.at(ZC, (z, c), w)
        zt = ZC.sum(1)
        self.hub_cat = np.zeros((n_regions, n_cats))
        hub_tot = np.zeros(n_regions)
        for st, M in pools.Mc.items():
            h, zz = pools.hubs[st], pools.zips[st]
            if len(h) and len(zz):
                Mf = M.astype(float)
                self.hub_cat[h] = Mf @ ZC[zz]
                hub_tot[h] = Mf @ zt[zz]
        self.pool_share = hub_tot / max(w.sum(), 1e-12)
        self._z, self._w = z, w                                        # rows stay sorted by product
        self._st = np.searchsorted(p, np.arange(n_products), side="left")
        self._en = np.searchsorted(p, np.arange(n_products), side="right")
        self._cache = {}
        return self

    def pool_counts(self, pid: np.ndarray, region: np.ndarray) -> np.ndarray:
        key = (hash(pid.tobytes()), hash(region.tobytes()), len(pid))
        if key in self._cache:
            return self._cache[key]
        pools = self.pools
        out = np.zeros(len(pid))
        order = np.argsort(pid, kind="stable")
        ps = pid[order]
        cut = np.flatnonzero(np.r_[True, ps[1:] != ps[:-1], True])
        for a, b in zip(cut[:-1], cut[1:]):
            p = ps[a]
            s, e = self._st[p], self._en[p]
            if s == e:
                continue
            q = order[a:b]
            zz, ww = self._z[s:e], self._w[s:e]
            hubs = region[q]
            hs, zs = pools.hub_state_code[hubs], pools.zip_state_code[zz]
            for st in np.unique(hs):
                qi, zi = np.flatnonzero(hs == st), np.flatnonzero(zs == st)
                if len(zi):
                    out[q[qi]] = pools.Mc[st][np.ix_(pools.hub_local[hubs[qi]], pools.zip_local[zz[zi]])] @ ww[zi]
        if len(self._cache) > 64:
            self._cache.clear()
        self._cache[key] = out
        return out

    def params(self, pid: np.ndarray, region: np.ndarray):
        pid, region = np.asarray(pid, np.int64), np.asarray(region, np.int64)
        n = self.pool_counts(pid, region)
        c = self.prod_cat[pid].astype(np.int64)
        share = (self.hub_cat[region, c] + self.beta * self.pool_share[region]) / (self.n_c[c] + self.beta)
        mu = self.n_p[pid] / self.Ew * share
        a = n + self.alpha
        with np.errstate(divide="ignore", invalid="ignore"):
            b = np.where(mu > 0, self.Ew + self.alpha / mu, np.inf)
            lam = np.where(np.isfinite(b), a / b, 0.0)
        k = 1.0 / (1.0 / a + self.phi)
        return lam, k, n, mu


def censored_loglik(F: np.ndarray, day: np.ndarray, dur: np.ndarray, ev: np.ndarray):
    """Proper scoring rule for discrete, right-censored time-to-sale."""
    idx = np.arange(len(F))
    eps = 1e-9
    ll_ev = np.log(np.clip(F[idx, day] - F[idx, np.maximum(day - 1, 0)], eps, None))
    ll_ce = np.log(np.clip(1 - F[idx, dur], eps, None))
    return float(np.where(ev, ll_ev, ll_ce).mean())


class Calibrator:
    """F3 — shape-preserving recalibration of the time-to-sale curve.
    Cumulative hazard Λ(t) = −log(1 − F(t)) is mapped to  Λ_cal(t) = exp(a) · Λ(t)^b,
    a, b fitted by maximum censored likelihood on a window of returns with known outcomes.
    (Isotonic regression was tried first: it plateaus at the top of the range and bends the day-by-day
    curve, which the per-day output needs to be smooth — so the parametric map is used.)"""

    def fit(self, F, dur, ev):
        from scipy.optimize import minimize
        idx = np.arange(len(F))
        Lam = -np.log(np.clip(1 - F, 1e-12, 1))
        d1 = np.where(ev, day_or(dur), dur)
        def nll(th):
            a, lb = th
            L = np.exp(a) * np.clip(Lam, 1e-12, None) ** np.exp(lb)
            S = np.exp(-L)
            S[:, 0] = 1.0
            ll = np.where(ev, np.log(np.clip(S[idx, np.maximum(d1 - 1, 0)] - S[idx, d1], 1e-12, None)),
                          np.log(np.clip(S[idx, d1], 1e-12, None)))
            return -ll.mean()
        r = minimize(nll, x0=[0.0, 0.0], method="Nelder-Mead", options=dict(xatol=1e-4, fatol=1e-7, maxiter=400))
        self.a, self.b = float(r.x[0]), float(np.exp(r.x[1]))
        return self

    def __call__(self, F):
        Lam = -np.log(np.clip(1 - F, 1e-12, 1))
        G = 1 - np.exp(-np.exp(self.a) * np.clip(Lam, 0, None) ** self.b)
        G[..., 0] = 0.0
        return G

    def point(self, p):
        """Calibrate a single-horizon probability (used for the 1-day hazard in F4)."""
        Lam = -np.log(np.clip(1 - np.asarray(p, float), 1e-12, 1))
        return 1 - np.exp(-np.exp(self.a) * Lam ** self.b)


def day_or(dur):
    return dur


# =============================================================================
# 7. ENGINE
# =============================================================================
class SalvageEngine:
    def __init__(self, ds: Dataset, cfg: EngineConfig | None = None, cc: CostConfig | None = None):
        self.ds, self.cfg, self.cc = ds, cfg or EngineConfig(), cc or CostConfig()
        self.K = self.cfg.max_days

    # ---- geography -------------------------------------------------------------------------
    def build_geography(self, fit_end_ts, verbose=True):
        fe = self.ds.days(fit_end_ts)
        self.Z, self.R, self.areas, self.area_curves, self.geo_info = build_regions(self.ds, self.cfg, self.cc, fe,
                                                                                    verbose)
        self.ri = RegionIndex(self.Z, self.R)
        self.reg = self.ri.of_rows(self.ds.E)
        self.nR = len(self.R)
        self.zrow = self.ds.E.customer_zip_code_prefix.map(dict(zip(self.Z.zip, range(len(self.Z))))).values
        zz = self.Z.assign(w=self.Z.orders_train.astype(float) + 1e-3)
        self.hub_state_real = (zz.groupby(["region", "state"]).w.sum().reset_index().sort_values("w")
                               .drop_duplicates("region", keep="last").set_index("region").state
                               .reindex(np.arange(self.nR)).values)
        self.set_pool(verbose)
        return self

    def set_pool(self, verbose=False):
        """(Re)build the resale pools and holding caps from cfg — cheap; lets a sweep reuse the geography."""
        cfg = self.cfg
        if cfg.resale_pool == "radius":
            self.pools = StatePools(self.Z.assign(state="ALL"), self.R, {"ALL": float(cfg.resale_radius_km)})
            txt = f"any buyer within {cfg.resale_radius_km:.0f} km of the hub"
        elif cfg.resale_pool == "state":
            self.pools = StatePools(self.Z, self.R, cfg.state_radius_km, cfg.pool_cap_km)
            txt = "same state within the state radius" + (f" (≤{cfg.pool_cap_km:.0f} km)" if cfg.pool_cap_km else "")
        else:
            self.pools, txt = None, "own hub zone only"
        self.max_hold = self._max_hold()
        if verbose:
            mh = self.max_hold[self.ds.E.is_anchor.values]
            print(f"[pool] resale pool = {txt} | holding cap {cfg.max_hold_days} d + 45-day rule → median max hold "
                  f"{np.median(mh):.0f} d; {(mh == 0).mean() * 100:.1f}% of returns have no time left")
        return self

    def _max_hold(self) -> np.ndarray:
        """Days a returned unit may be held = min(holding-time cap, room left by Meesho's 45-day rule).
        45-day room = 45 − forward lane − NDR window − return lane − buffer, using each order's own
        dispatch→delivery time for both lanes. self.lost_room keeps the 45-day room alone (for the time curve)."""
        cfg, E = self.cfg, self.ds.E
        if not cfg.apply_lost_rule or "lane_days" not in E:
            room = np.full(len(E), self.K)
        else:
            left = cfg.lost_rule_days - cfg.ndr_days - cfg.return_buffer_days - 2 * E.lane_days.values
            room = np.clip(np.floor(left), 0, self.K).astype(int)
        self.lost_room = room
        cap = self.K if cfg.max_hold_days is None else min(int(cfg.max_hold_days), self.K)
        return np.minimum(room, cap).astype(int)

    def pool_text(self, region: int) -> str:
        return self.pools.describe(region) if self.pools is not None else "own hub zone"

    def pool_radius(self, region) -> np.ndarray:
        region = np.asarray(region)
        if self.pools is None:
            return self.R.set_index("region").R_area.reindex(region).values
        return self.pools.radius_by_code[self.pools.hub_state_code[region]]

    def _model(self, params, ref_t):
        P = self.ds.products
        if self.pools is not None:
            return PoolDemandModel(**params).fit(self.ds.E, self.reg, self.nR, len(P), len(self.ds.categories),
                                                 P.cat.values, ref_t, self.pools, self.zrow)
        return DemandModel(**params).fit(self.ds.E, self.reg, self.nR, len(P), len(self.ds.categories),
                                         P.cat.values, ref_t, self.R.area.values)

    def _labels(self, start_t, end_t, censor_t=None):
        E = self.ds.E
        m = E.is_anchor.values & (E.t_anchor.values >= start_t) & (E.t_anchor.values < end_t)
        ct = self.ds.days(self.ds.data_end) if censor_t is None else censor_t
        if self.pools is not None:
            return pool_labels(E, self.reg, self.zrow, self.pools, m, ct, self.K)
        return region_labels(E, self.reg, m, ct, self.K)

    # ---- tuning (F2) + calibration (F3) -------------------------------------------------------
    def tune(self, verbose=True):
        cfg, E = self.cfg, self.ds.E
        tr, va = self.ds.days(cfg.train_end), self.ds.days(cfg.val_end)
        A, day, dur, ev = self._labels(tr, va)
        pid, reg = E.pid.values[A], self.reg[A]
        rows = []
        for H in cfg.half_life_grid:
            for beta in cfg.beta_grid:
                base = self._model(dict(half_life=H, alpha=1.0, phi=0.0, beta=beta), tr)
                for alpha in cfg.alpha_grid:
                    for phi in cfg.phi_grid:
                        base.alpha, base.phi = alpha, phi
                        F, *_ = base.curve(pid, reg, self.K)
                        rows.append(dict(half_life=H, beta=beta, alpha=alpha, phi=phi,
                                         loglik=censored_loglik(F, day, dur, ev)))
        T = pd.DataFrame(rows).sort_values("loglik", ascending=False).reset_index(drop=True)
        b = T.iloc[0]
        self.params = dict(half_life=None if pd.isna(b.half_life) else float(b.half_life), alpha=float(b.alpha),
                           phi=float(b.phi), beta=float(b.beta))
        m = self._model(self.params, tr)
        F, *_ = m.curve(pid, reg, self.K)
        self.cal = Calibrator().fit(F, dur, ev)
        self.tuning = T
        self.val_raw = dict(F=F, dur=dur, ev=ev)
        if verbose:
            print(f"[tune] best on validation: {self.params} (log-lik {b.loglik:.4f}; "
                  f"no recency {T[T.half_life.isna()].loglik.max():.4f})")
        return self

    def calibrator_at(self, s: float) -> "Calibrator":
        """Rolling recalibration for decisions made from time s: returns whose 30-day outcome is fully known
        by s (delivered in [s − window − 30, s − 30)), predicted by a model fitted before that window."""
        K, w = self.K, self.cfg.recal_window_days
        a0, a1 = s - w - K, s - K
        A, day, dur, ev = self._labels(a0, a1, censor_t=s)
        mod = self._model(self.params, a0)
        F, *_ = mod.curve(self.ds.E.pid.values[A], self.reg[A], K)
        return Calibrator().fit(F, dur, ev)

    # ---- prediction ----------------------------------------------------------------------------
    def predict(self, model: DemandModel, pid, region, calibrated=True):
        F, lam, k, n = model.curve(pid, region, self.K)
        return (self.cal(F) if calibrated else F), lam, k, n

    # ---- backtest --------------------------------------------------------------------------------
    def backtest(self, verbose=True):
        cfg, cc, E, K = self.cfg, self.cc, self.ds.E, self.K
        va = self.ds.days(cfg.val_end)
        te = self.ds.days(self.ds.data_end) - K
        A, day, dur, ev = self._labels(va, te)
        tA = E.t_anchor.values[A]
        pid, reg = E.pid.values[A], self.reg[A]
        # monthly rolling refits (only data before each month is used)
        month_starts = pd.date_range(pd.Timestamp(cfg.val_end), self.ds.ts(te), freq="MS")
        bounds = [self.ds.days(m) for m in month_starts] + [te]
        Fc = np.zeros((len(A), K + 1)); Fr = np.zeros_like(Fc)
        lam = np.zeros(len(A)); kk = np.zeros(len(A))
        self.monthly_models = []
        self.monthly_cal = []
        for s, e in zip(bounds[:-1], bounds[1:]):
            m = (tA >= s) & (tA < e)
            mod = self._model(self.params, s)
            cal = self.calibrator_at(s)
            self.monthly_models.append((s, mod))
            self.monthly_cal.append(cal)
            F, l, k, _ = mod.curve(pid[m], reg[m], K)
            Fr[m], Fc[m], lam[m], kk[m] = F, cal(F), l, k
        res = {}
        cap = self.max_hold[A]
        for name, F in (("model (calibrated)", Fc), ("model (uncalibrated)", Fr)):
            pol = policy_from_curve(F, cc, cap=cap)
            res[name] = self._realise(pol["hold"], pol["T"], day, ev, name, pred=pol["P_T"])
        res["hold everything (max days)"] = self._realise(cap > 0, cap, day, ev, "hold everything (max days)")
        res["always return (status quo)"] = self._realise(np.zeros(len(A), bool), np.zeros(len(A), int), day, ev,
                                                          "always return (status quo)")
        orc = ev & (day <= cap)
        res["perfect hindsight"] = self._realise(orc, np.where(orc, day, 0), day, ev, "perfect hindsight")
        polc = policy_from_curve(Fc, cc, cap=cap)
        res["model + daily re-decision (F4)"] = self._replay_f4(A, pid, reg, tA, day, ev, polc, lam, kk)
        self.bt = dict(A=A, day=day, dur=dur, ev=ev, pid=pid, reg=reg, F=Fc, Fr=Fr, pol=polc, cap=cap)
        if self.pools is not None:     # resale reach: own hub zone vs state pool, same returns, same horizon
            _, dh, _, eh = region_labels(E, self.reg, np.isin(np.arange(len(E)), A), self.ds.days(self.ds.data_end), K)
            st = self.hub_state_real[reg]
            prad = pd.Series(self.pool_radius(reg)).groupby(st).median()
            self.pool_compare = (pd.DataFrame(dict(state=st, hub=(eh & (dh <= K)), pool=(ev & (day <= K)),
                                                   hub_cap=(eh & (dh <= cap)), pool_cap=(ev & (day <= cap))))
                                 .groupby("state").agg(returns=("hub", "size"), resale_hub_zone_30d=("hub", "mean"),
                                                       resale_pool_30d=("pool", "mean"),
                                                       resale_hub_zone_maxdays=("hub_cap", "mean"),
                                                       resale_pool_maxdays=("pool_cap", "mean"))
                                 .assign(pool_radius_km=lambda d: prad.reindex(d.index).values)
                                 .sort_values("returns", ascending=False).reset_index())
        S = pd.DataFrame([self._summary(r, pid) for r in res.values()])
        self.bt_summary = S
        self.bt_results = res
        # segments: area class and the largest areas (model vs perfect hindsight)
        Rr = self.R.set_index("region")
        seg_cls = Rr["class"].reindex(reg).values
        seg_area = Rr["area_name"].reindex(reg).fillna("other areas").values
        rows = []
        for kind, lab in (("area class", seg_cls), ("area", seg_area)):
            for g in pd.unique(lab):
                m = lab == g
                if m.sum() < 200:
                    continue
                r0 = {k: (v[m] if isinstance(v, np.ndarray) else v) for k, v in res["model (calibrated)"].items()}
                o0 = res["perfect hindsight"]["cost"][m]
                sm = self._summary(r0, pid[m])
                rows.append(dict(segment_type=kind, segment=g, returns=int(m.sum()), hold_rate=sm["hold_rate"],
                                 resale_rate_on_hold=sm["resale_rate_on_hold"], saving_per_return=sm["saving_per_return"],
                                 ci_lo=sm["ci_lo"], ci_hi=sm["ci_hi"],
                                 saving_per_held_unit=(self.cc.status_quo - r0["cost"][r0["hold"]]).mean()
                                 if r0["hold"].any() else np.nan,
                                 hindsight_ceiling=float((self.cc.status_quo - o0).mean()),
                                 local_resale_30d=float((ev[m] & (day[m] <= K)).mean())))
        self.bt_segments = pd.DataFrame(rows)
        # calibration table on the test window
        rows, briers = [], []
        for h in (7, 14, 30):
            obs = ev & (day <= h) | (dur >= h)
            p, pr, y = Fc[obs, h], Fr[obs, h], (ev[obs] & (day[obs] <= h)).astype(float)
            q = np.quantile(p, np.linspace(0, 1, 11))
            bins = np.clip(np.searchsorted(q[1:-1], p, side="right"), 0, 9)
            for b_ in range(10):
                sel = bins == b_
                if sel.sum() >= 30:
                    rows.append(dict(horizon=h, decile=b_ + 1, n=int(sel.sum()), predicted=p[sel].mean(),
                                     realised=y[sel].mean()))
            base = y.mean()
            briers.append(dict(horizon=h, n=int(obs.sum()), base_rate=base, brier_calibrated=np.mean((p - y) ** 2),
                               brier_uncalibrated=np.mean((pr - y) ** 2), brier_base_rate=np.mean((base - y) ** 2)))
        self.calib = pd.DataFrame(rows)
        self.brier = pd.DataFrame(briers)
        self.brier["skill_vs_base_rate"] = 1 - self.brier.brier_calibrated / self.brier.brier_base_rate
        if verbose:
            cols = ["policy", "hold_rate", "resale_rate_on_hold", "predicted_on_hold", "avg_cost", "saving_per_return",
                    "ci_lo", "ci_hi"]
            print(S[cols].round(3).to_string(index=False))
        return self

    def time_cap_curve(self):
        """Saving per return if the holding cap were T = 1…K days (45-day rule still applied per unit), using
        the back-test's calibrated curves — shows where an extra day stops adding value."""
        b, cc, K = self.bt, self.cc, self.K
        room = self.lost_room[b["A"]]
        rows = []
        for T in range(1, K + 1):
            capT = np.minimum(room, T)
            pol = policy_from_curve(b["F"], cc, cap=capT)
            r = self._realise(pol["hold"], pol["T"], b["day"], b["ev"], f"cap {T}")
            h = r["hold"]
            rows.append(dict(cap_days=T, saving_per_return=float((cc.status_quo - r["cost"]).mean()), hold_rate=h.mean(),
                             resale_rate_on_hold=r["sold"][h].mean() if h.any() else np.nan,
                             avg_days_on_shelf=r["held_days"][h].mean() if h.any() else 0.0))
        T = pd.DataFrame(rows)
        T["gain_per_extra_day"] = T.saving_per_return.diff()
        T["share_of_max_value"] = (T.saving_per_return - T.saving_per_return.iloc[0]) / max(
            T.saving_per_return.iloc[-1] - T.saving_per_return.iloc[0], 1e-9)
        T["saving_per_shelf_day"] = T.saving_per_return / np.maximum(T.hold_rate * T.avg_days_on_shelf, 1e-9)
        self.time_curve = T
        return T

    def _realise(self, hold, T, day, ev, name, pred=None):
        cc = self.cc
        sold = hold & ev & (day <= T) & (day >= 1)
        cost = np.where(~hold, cc.status_quo, np.where(sold, cc.success_cost(day), cc.failure_cost(T)))
        return dict(name=name, hold=hold, sold=sold, cost=cost, T=T,
                    held_days=np.where(sold, day, np.where(hold, T, 0)), pred=pred)

    def _summary(self, r, pid):
        sq = self.cc.status_quo
        sav = sq - r["cost"]
        rng = np.random.default_rng(self.cfg.seed)
        up, inv = np.unique(pid, return_inverse=True)
        ps, pn = np.bincount(inv, weights=sav), np.bincount(inv)
        boots = [ps[k].sum() / pn[k].sum() for k in (rng.integers(0, len(up), len(up)) for _ in range(self.cfg.n_boot))]
        h = r["hold"]
        return dict(policy=r["name"], returns=len(sav), hold_rate=h.mean(),
                    resale_rate_on_hold=r["sold"][h].mean() if h.any() else np.nan,
                    predicted_on_hold=np.nanmean(r["pred"][h]) if (r.get("pred") is not None and h.any()) else np.nan,
                    avg_cost=r["cost"].mean(), saving_per_return=sav.mean(),
                    ci_lo=np.percentile(boots, 2.5), ci_hi=np.percentile(boots, 97.5),
                    saving_pct=100 * sav.mean() / sq, avg_days_held_on_hold=r["held_days"][h].mean() if h.any() else 0,
                    total_saving=sav.sum())

    def _replay_f4(self, A, pid, reg, tA, day, ev, pol, lam0, k0):
        """F4 — daily re-decision. At the start of each holding day the unit's demand model is refreshed with
        every order placed up to that moment (national demand of the product + recency decay of the regional
        evidence). The unit is released when P(sale during the coming day) × 120 < storage per day (INR 0.33).
        The decision for day d never looks at what happens on day d (no look-ahead)."""
        cc, K, E = self.cc, self.K, self.ds.E
        H = self.params["half_life"]
        hold = pol["hold"].copy()
        idx = np.flatnonzero(hold)
        starts = np.array([s for s, _ in self.monthly_models])
        mi = np.clip(np.searchsorted(starts, tA[idx], side="right") - 1, 0, len(starts) - 1)
        # static per-unit quantities from the month's model
        n0 = np.zeros(len(idx)); share = np.zeros(len(idx)); refT = np.zeros(len(idx))
        alpha, phi = self.params["alpha"], self.params["phi"]
        for j, (s_, mod) in enumerate(self.monthly_models):
            sel = mi == j
            if not sel.any():
                continue
            _, _, n, mu = mod.params(pid[idx[sel]], reg[idx[sel]])
            npn = mod.n_p[pid[idx[sel]]]
            n0[sel] = n
            share[sel] = np.where(npn > 0, mu * mod.Ew / np.maximum(npn, 1e-12), 0.0)
            refT[sel] = mod.ref_t
        # prefix sums of decayed order weights per product (E is sorted by pid, t)
        t_all, p_all = E.t.values, E.pid.values.astype(np.int64)
        base = 2.0 ** (t_all / H) if H else np.ones(len(t_all))
        cum = np.r_[0.0, np.cumsum(base)]
        key_all = p_all * 10_000 + t_all
        alive = np.ones(len(idx), bool)
        Tlim = pol["T"][idx]
        released_at = Tlim.copy()
        rows = []
        for d in range(1, K + 1):
            pos = np.flatnonzero(alive)
            if len(pos) == 0:
                break
            u = idx[pos]
            tnow = tA[u] + d - 1
            lo = np.searchsorted(key_all, pid[u].astype(np.int64) * 10_000 - 1)
            hi = np.searchsorted(key_all, pid[u].astype(np.int64) * 10_000 + tnow)
            if H:
                W = (cum[hi] - cum[lo]) * 2.0 ** (-tnow / H)
                Ew = H / math.log(2) * (1 - 0.5 ** (tnow / H))
                decay = 0.5 ** ((tnow - refT[pos]) / H)
            else:
                W, Ew, decay = (hi - lo).astype(float), tnow, 1.0
            mu = W / Ew * share[pos]
            a = n0[pos] * decay + alpha
            with np.errstate(divide="ignore", invalid="ignore"):
                b = np.where(mu > 0, Ew + alpha / mu, np.inf)
                lam = np.where(np.isfinite(b), a / b, 0.0)
            k = 1.0 / (1.0 / a + phi)
            F1 = 1 - (1 + lam / k) ** (-k)
            hz = np.zeros(len(pos))
            for j in np.unique(mi[pos]):
                sel = mi[pos] == j
                hz[sel] = self.monthly_cal[j].point(F1[sel])
            stop = (hz * cc.reverse < cc.per_day) | (d > Tlim[pos])   # decided before seeing day d
            sold = (~stop) & ev[u] & (day[u] == d)
            released_at[pos[stop]] = np.minimum(d - 1, Tlim[pos[stop]])
            alive[pos[stop | sold]] = False
            # O7 log: every release, plus the full day-by-day trajectory of a fixed sample of held units
            logj = np.flatnonzero(stop | (pos < 60))
            for j in logj[: max(0, 5000 - len(rows))]:
                act = ("return to seller today" if stop[j] else "sold to a local customer" if sold[j]
                       else "keep on shelf")
                rows.append(dict(unit_row=int(A[u[j]]), product_id=self.ds.products.product_id.values[pid[u[j]]],
                                 region=int(reg[u[j]]), day=d, p_sale_today=round(float(hz[j]), 5),
                                 breakeven_daily_p=round(cc.per_day / cc.reverse, 5), action=act))
        T = np.zeros(len(A), int)
        T[idx] = released_at
        h2 = hold.copy()
        h2[idx[released_at == 0]] = False
        self.f4_log = pd.DataFrame(rows)
        return self._realise(h2, T, day, ev, "model + daily re-decision (F4)", pred=pol["P_T"])

    # ---- capacity-aware competition simulation (F1) ----------------------------------------------
    def simulate_capacity(self, verbose=True):
        if self.pools is not None:
            return self._simulate_capacity_pool(verbose)
        cfg, cc, E, K = self.cfg, self.cc, self.ds.E, self.K
        b = self.bt
        A, pid, reg = b["A"], b["pid"], b["reg"]
        tA = E.t_anchor.values[A]
        mod = self.monthly_models[0][1]
        U = cfg.max_units
        # n-th unit policy per (product, region) seen among test returns
        keys = pd.Series(pid.astype(np.int64) * self.nR + reg)
        ukeys = keys.unique()
        up, ur = ukeys // self.nR, ukeys % self.nR
        Fn = mod.unit_curve(up, ur, U, K)
        F1 = mod.curve(up, ur, K)[0]
        ratio = np.where(F1 > 1e-9, self.monthly_cal[0](F1) / np.maximum(F1, 1e-9), 1.0)
        Fn = np.clip(Fn * ratio[:, None, :], 0, 1)
        pol = policy_from_curve(Fn, cc)
        Tn, hn = pol["T"], pol["hold"]                      # (keys, U)
        kpos = dict(zip(ukeys, range(len(ukeys))))
        # demand stream per key from test start onward
        allkey = E.pid.values.astype(np.int64) * self.nR + self.reg
        dem_mask = np.isin(allkey, ukeys) & (E.t.values >= self.ds.days(cfg.val_end))
        dem = pd.DataFrame(dict(key=allkey[dem_mask], t=E.t.values[dem_mask], cust=E.cust.values[dem_mask],
                                row=np.flatnonzero(dem_mask)))
        dem_by_key = {k: g for k, g in dem.groupby("key")}
        out = []
        rng = np.random.default_rng(cfg.seed)
        for rho in cfg.rto_rates:
            for sim in range(cfg.n_sims):
                ret = rng.random(len(A)) < rho
                ret_rows = A[ret]
                res = {}
                for mode in ("naive (each unit judged alone)", "capacity-aware (k-th unit rule)"):
                    cost = np.full(len(A), np.nan)
                    for k_, ix in pd.Series(np.flatnonzero(ret)).groupby(keys.values[ret]):
                        ix = np.sort(ix.values)
                        ix = ix[np.argsort(tA[ix])]
                        kp = kpos[k_]
                        g = dem_by_key.get(k_)
                        if g is not None:
                            g = g[~np.isin(g.row.values, ret_rows)]
                            dts, dcs = g.t.values, g.cust.values
                        else:
                            dts, dcs = np.array([]), np.array([])
                        held = []                                  # [expiry, start, cust, idx]
                        events = sorted([(tA[i], 0, i) for i in ix] + [(t, 1, j) for j, t in enumerate(dts)])
                        for tt, typ, i in events:
                            for h in [h for h in held if h[0] < tt]:
                                cost[h[3]] = cc.failure_cost(h[0] - h[1])
                                held.remove(h)
                            if typ == 0:
                                n = len(held) + 1 if mode.startswith("capacity") else 1
                                n = min(n, U)
                                if hn[kp, n - 1]:
                                    held.append([tA[i] + Tn[kp, n - 1], tA[i], E.cust.values[A[i]], i])
                                else:
                                    cost[i] = cc.status_quo
                            else:
                                cand = [h for h in held if h[1] < tt and h[2] != dcs[i]]
                                if cand:
                                    h = min(cand, key=lambda x: x[0])
                                    cost[h[3]] = cc.success_cost(max(1, math.ceil(tt - h[1])))
                                    held.remove(h)
                        for h in held:
                            cost[h[3]] = cc.failure_cost(h[0] - h[1])
                    res[mode] = cc.status_quo - cost[ret]
                for mode, s in res.items():
                    out.append(dict(rto_rate=rho, sim=sim, policy=mode, returns=int(ret.sum()),
                                    saving_per_return=float(np.nanmean(s))))
        self.capacity = pd.DataFrame(out)
        self.stock_cap_policy = (ukeys, hn, Tn)
        if verbose:
            print(self.capacity.groupby(["rto_rate", "policy"]).saving_per_return.mean().round(2).unstack())
        return self

    def _simulate_capacity_pool(self, verbose=True):
        """F1 with state pools: every returned unit of a product held anywhere in a state competes for the same
        buyers. A buyer can take a held unit only if the buyer is inside that unit's resale pool. The n-th unit
        rule counts the units already held whose hubs are within the pool radius of the new unit's hub."""
        cfg, cc, E, K = self.cfg, self.cc, self.ds.E, self.K
        pools = self.pools
        b = self.bt
        A, pid, reg, cap = b["A"], b["pid"], b["reg"], b["cap"]
        tA = E.t_anchor.values[A]
        mod, cal = self.monthly_models[0][1], self.monthly_cal[0]
        U = cfg.max_units
        keys = pid.astype(np.int64) * self.nR + reg
        ukeys, kinv = np.unique(keys, return_inverse=True)
        up, ur = ukeys // self.nR, ukeys % self.nR
        Fn = mod.unit_curve(up, ur, U, K)
        F1 = mod.curve(up, ur, K)[0]
        ratio = np.where(F1 > 1e-9, cal(F1) / np.maximum(F1, 1e-9), 1.0)
        pol = policy_from_curve(np.clip(Fn * ratio[:, None, :], 0, 1), cc)
        Tn, hn = pol["T"], pol["hold"]
        hst = pools.hub_state_code
        grp = pid.astype(np.int64) * 1000 + hst[reg]
        zst = pools.zip_state_code[self.zrow]
        dm = np.isin(E.pid.values, np.unique(pid)) & (E.t.values >= self.ds.days(cfg.val_end))
        D = pd.DataFrame(dict(g=E.pid.values[dm].astype(np.int64) * 1000 + zst[dm], t=E.t.values[dm],
                              cust=E.cust.values[dm], z=self.zrow[dm], row=np.flatnonzero(dm)))
        dem_by = {k: g for k, g in D.groupby("g")}
        custA = E.cust.values[A]
        out = []
        rng = np.random.default_rng(cfg.seed)
        for rho in cfg.rto_rates:
            for sim in range(cfg.n_sims):
                ret = rng.random(len(A)) < rho
                ret_rows = set(A[ret].tolist())
                res = {}
                for mode in ("naive (each unit judged alone)", "capacity-aware (k-th unit rule)"):
                    cost = np.full(len(A), np.nan)
                    for g_, ix in pd.Series(np.flatnonzero(ret)).groupby(grp[ret]):
                        ix = ix.values[np.argsort(tA[ix.values], kind="stable")]
                        st = int(g_ % 1000)
                        M, HH = pools.Mc[st], pools.HH[st]
                        g = dem_by.get(g_)
                        if g is not None:
                            keep = np.array([r not in ret_rows for r in g.row.values], bool)
                            dts, dcs, dzs = g.t.values[keep], g.cust.values[keep], g.z.values[keep]
                        else:
                            dts = dcs = dzs = np.array([])
                        held = []                          # [expiry, start, cust, idx, hub_local]
                        events = sorted([(tA[i], 0, i) for i in ix] + [(t, 1, j) for j, t in enumerate(dts)])
                        for tt, typ, i in events:
                            for h in [h for h in held if h[0] < tt]:
                                cost[h[3]] = cc.failure_cost(h[0] - h[1])
                                held.remove(h)
                            if typ == 0:
                                hl = pools.hub_local[reg[i]]
                                n = 1
                                if mode.startswith("capacity"):
                                    n = 1 + sum(1 for h in held if HH[hl, h[4]])
                                n = min(n, U)
                                kp = kinv[i]
                                T = min(int(Tn[kp, n - 1]), int(cap[i]))
                                if hn[kp, n - 1] and T > 0:
                                    held.append([tA[i] + T, tA[i], custA[i], i, hl])
                                else:
                                    cost[i] = cc.status_quo
                            else:
                                zl = pools.zip_local[dzs[i]]
                                cand = [h for h in held if h[1] < tt and h[2] != dcs[i] and M[h[4], zl]]
                                if cand:
                                    h = min(cand, key=lambda x: x[0])
                                    cost[h[3]] = cc.success_cost(max(1, math.ceil(tt - h[1])))
                                    held.remove(h)
                        for h in held:
                            cost[h[3]] = cc.failure_cost(h[0] - h[1])
                    res[mode] = cc.status_quo - cost[ret]
                for mode, sv in res.items():
                    out.append(dict(rto_rate=rho, sim=sim, policy=mode, returns=int(ret.sum()),
                                    saving_per_return=float(np.nanmean(sv))))
        self.capacity = pd.DataFrame(out)
        self.stock_cap_policy = (ukeys, hn, Tn)
        if verbose:
            print(self.capacity.groupby(["rto_rate", "policy"]).saving_per_return.mean().round(2).unstack())
        return self

    # ---- production outputs (fit on all data) ------------------------------------------------------
    def fit_production(self):
        end = self.ds.days(self.ds.data_end)
        self.prod_model = self._model(self.params, end)
        self.cal = self.calibrator_at(end)          # production calibration: latest 90 days with known outcomes
        # typical days left under the 45-day rule for a return at each hub (median of its recent lanes)
        E = self.ds.E
        m = E.is_anchor.values
        mh = pd.Series(self.max_hold[m]).groupby(self.reg[m]).median()
        glob = float(np.median(self.max_hold[m]))
        self.hub_cap = mh.reindex(np.arange(self.nR)).fillna(glob).round().astype(int).values
        return self

    def product_region_summary(self, min_orders: float = 1.0) -> pd.DataFrame:
        m = self.prod_model
        keys = m.n_pr.index.values[m.n_pr.values >= 0]
        pid, reg = keys // self.nR, keys % self.nR
        F, lam, k, n = self.predict(m, pid, reg)
        capd = self.hub_cap[reg]
        pol = policy_from_curve(F, self.cc, cap=capd)
        # stock cap via k-th unit rule (only for HOLD pairs)
        cap = np.zeros(len(pid), int)
        hold_idx = np.flatnonzero(pol["hold"])
        if len(hold_idx):
            Fn = m.unit_curve(pid[hold_idx], reg[hold_idx], self.cfg.max_units, self.K)
            F1 = m.curve(pid[hold_idx], reg[hold_idx], self.K)[0]
            ratio = np.where(F1 > 1e-9, self.cal(F1) / np.maximum(F1, 1e-9), 1.0)
            pn = policy_from_curve(np.clip(Fn * ratio[:, None, :], 0, 1), self.cc, cap=capd[hold_idx])
            hn = pn["hold"]
            cap[hold_idx] = np.where(hn.all(1), self.cfg.max_units, hn.argmin(1))
        P, R = self.ds.products, self.R.set_index("region")
        ev_lvl = np.select([n >= 5, n >= 1], ["product-region history", "thin history (shrunk)"],
                           "category / national prior")
        df = pd.DataFrame(dict(
            product_id=P.product_id.values[pid], category=P.category_english.values[pid], region=reg,
            region_name=R.name.reindex(reg).values, area_class=R["class"].reindex(reg).values,
            hub_radius_km=R.R_area.reindex(reg).values,
            hub_state=self.hub_state_real[reg],
            resale_pool_radius_km=self.pool_radius(reg), max_hold_days=capd,
            demand_per_month=np.round(lam * 30, 3),
            weighted_orders=np.round(n, 2), evidence=ev_lvl,
            decision=np.where(pol["hold"], "HOLD", "RETURN"), hold_until_day=pol["T"],
            p_sold_by_hold_until=np.round(pol["P_T"], 4), p_sold_by_day7=np.round(F[:, 7], 4),
            p_sold_by_day30=np.round(F[:, self.K], 4),
            breakeven_day=pol["breakeven_day"], most_likely_day=np.where(F[:, self.K] > 0, pol["likely_day"], -1),
            median_day=pol["median_day"], expected_cost=np.round(pol["cost"], 2),
            expected_saving=np.round(self.cc.status_quo - pol["cost"], 2), stock_cap_units=cap))
        return df.sort_values(["decision", "expected_saving"], ascending=[True, False]).reset_index(drop=True)

    def timeline(self, product_id: str, region: int) -> pd.DataFrame:
        p = int(self.ds.products.index[self.ds.products.product_id == product_id][0])
        F, *_ = self.predict(self.prod_model, np.array([p]), np.array([region]))
        F = F[0]
        req = p_required(F[None], self.cc)[0]
        C, _ = cost_curve(F[None], self.cc)
        return pd.DataFrame(dict(day=np.arange(self.K + 1), p_sold_by_day=F, p_sold_on_day=np.r_[0, np.diff(F)],
                                 p_required=req, expected_cost=C[0]))

    def area_surface(self, area: int, radii=None):
        """O4 — P(sold by day t | radius R) for the area's top-20 products (pooled Kaplan–Meier, all data).
        With state pools the radius runs out to the state radius and only same-state buyers count."""
        E, K = self.ds.E, self.K
        end = self.ds.days(self.ds.data_end)
        zi = dict(zip(self.Z.zip, self.Z.area))
        inA = E.customer_zip_code_prefix.map(zi).values == area
        top = pd.Series(E.pid.values[inA]).value_counts().index[:self.cfg.area_top_products]
        m = E.is_anchor.values & inA & np.isin(E.pid.values, top)
        if self.pools is not None:
            st = self.pools.hub_state_code[self.reg[np.flatnonzero(m)[0]]]
            Rs = self.pools.radius_by_code[st]
            if radii is None:
                radii = sorted({r for r in (2, 5, 10, 15, 20, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600)
                                if r < Rs} | {round(Rs)})
            _, day, dur, ev = circle_labels(E, m, end, radii, K, row_state=self.pools.zip_state_code[self.zrow],
                                            anchor_state=self.pools.hub_state_code[self.reg])
        else:
            radii = radii or (1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30)
            _, day, dur, ev = circle_labels(E, m, end, radii, K)
        F = np.array([km_curve(dur[:, i], ev[:, i], K)[0] for i in range(len(radii))])
        pol = policy_from_curve(F, self.cc)
        return dict(radii=np.array(radii), F=F, pol=pol, returns=int(m.sum()), req=p_required(F, self.cc))

    def recommend(self, product_id: str, lat: float, lon: float) -> dict:
        """O1 — decision card for a returned unit."""
        P = self.ds.products
        hit = P.index[P.product_id == product_id]
        r = self.ri.of_point(lat, lon)
        Rr = self.R.set_index("region").loc[r]
        if len(hit) == 0:
            return dict(product_id=product_id, region=Rr["name"], decision="RETURN", reason="unknown product")
        p = int(hit[0])
        F, lam, k, n = self.predict(self.prod_model, np.array([p]), np.array([r]))
        pol = policy_from_curve(F, self.cc, cap=self.hub_cap[[r]])
        card = dict(product_id=product_id, category=P.category_english.values[p], region=Rr["name"],
                    hub_radius_km=float(Rr.R_area), resale_pool=self.pool_text(r),
                    resale_pool_radius_km=float(self.pool_radius([r])[0]), max_hold_days=int(self.hub_cap[r]),
                    decision="HOLD" if pol["hold"][0] else "RETURN",
                    hold_until_day=int(pol["T"][0]), p_sold_by_hold_until=float(pol["P_T"][0]),
                    breakeven_day=int(pol["breakeven_day"][0]), most_likely_day=int(pol["likely_day"][0]),
                    median_day=int(pol["median_day"][0]), expected_cost=float(pol["cost"][0]),
                    status_quo=self.cc.status_quo, expected_saving=float(self.cc.status_quo - pol["cost"][0]),
                    demand_per_month=float(lam[0] * 30))
        return card

    def top_regions(self, product_id: str, k: int = 10) -> pd.DataFrame:
        p = int(self.ds.products.index[self.ds.products.product_id == product_id][0])
        regs = np.arange(self.nR)
        F, lam, kk, n = self.predict(self.prod_model, np.full(self.nR, p), regs)
        pol = policy_from_curve(F, self.cc, cap=self.hub_cap)
        R = self.R
        df = pd.DataFrame(dict(region=regs, name=R.name.values, lat=R.lat.values, lon=R.lon.values,
                               demand_per_month=lam * 30, p_by_day30=F[:, self.K], p_by_hold=pol["P_T"],
                               hold_until=pol["T"], decision=np.where(pol["hold"], "HOLD", "RETURN"),
                               saving=self.cc.status_quo - pol["cost"], orders_seen=n))
        return df.sort_values("p_by_day30", ascending=False).head(k).reset_index(drop=True)


def _kneedle(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    xn = (x - x[0]) / (x[-1] - x[0]); yn = (y - y.min()) / max(y.max() - y.min(), 1e-9)
    return float(x[np.argmax(yn - xn)])


def radius_sweep(base: "SalvageEngine", radii=(10, 25, 50, 70, 100, 150, 200), verbose=True) -> pd.DataFrame:
    """Re-run tuning + back-test with the resale radius set to each value (geography reused), to show the
    saving-vs-radius curve and where an extra kilometre stops adding value."""
    rows = []
    for R_ in radii:
        t = time.time()
        e = SalvageEngine(base.ds, replace(base.cfg, resale_pool="radius", resale_radius_km=float(R_)), base.cc)
        for a in ("Z", "R", "areas", "area_curves", "geo_info", "ri", "reg", "nR", "zrow", "hub_state_real"):
            setattr(e, a, getattr(base, a))
        e.set_pool(False).tune(False).backtest(False)
        m = e.bt_summary.set_index("policy").loc["model (calibrated)"]
        seg = e.bt_segments[e.bt_segments.segment_type == "area class"].set_index("segment").saving_per_return
        rows.append(dict(radius_km=R_, saving_per_return=m.saving_per_return, ci_lo=m.ci_lo, ci_hi=m.ci_hi,
                         hold_rate=m.hold_rate, resale_rate_on_hold=m.resale_rate_on_hold,
                         launch=seg.get("launch", np.nan), marginal=seg.get("marginal", np.nan),
                         small_towns=seg.get("data-poor (density law)", np.nan)))
        if verbose:
            print(f"  [radius sweep] {R_:>4} km → ₹{m.saving_per_return:.2f}/return ({time.time() - t:.0f}s)")
    D = pd.DataFrame(rows)
    D["gain_per_10km"] = D.saving_per_return.diff() / D.radius_km.diff() * 10
    D.attrs["elbow_km"] = _kneedle(D.radius_km, D.saving_per_return)
    return D


# =============================================================================
# 8. ONE-CALL PIPELINE
# =============================================================================
def run_all(data_dir: str, out_dir: str = "outputs_v2", cfg: EngineConfig | None = None,
            cc: CostConfig | None = None, verbose=True, do_capacity=True, do_radius_sweep=False,
            sweep_radii=(10, 25, 50, 70, 100, 150, 200)):
    t0 = time.time()
    cfg, cc = cfg or EngineConfig(), cc or CostConfig()
    os.makedirs(out_dir, exist_ok=True)
    ds = load_olist(data_dir, cfg, verbose)
    eng = SalvageEngine(ds, cfg, cc)
    eng.build_geography(cfg.val_end, verbose)          # radius & regions from data before the test window
    eng.tune(verbose)
    eng.backtest(verbose)
    eng.time_cap_curve()
    if verbose:
        tc = eng.time_curve.set_index("cap_days")
        c_ = min(cfg.max_hold_days, eng.K)
        print(f"[time cap] ₹/return with cap 7/14/{c_}/{eng.K} d: " +
              " / ".join(f"{tc.saving_per_return[d]:.2f}" for d in (7, 14, c_, eng.K)) +
              f" → {tc.share_of_max_value[c_] * 100:.0f}% of the {eng.K}-day value at {c_} d")
    if do_capacity:
        eng.simulate_capacity(verbose)
    if do_radius_sweep:
        if verbose:
            print("[radius sweep] re-running the back-test at each resale radius …")
        eng.radius_curve = radius_sweep(eng, sweep_radii, verbose)
    eng.fit_production()
    # ---- write tables ----------------------------------------------------------------------------
    eng.R.to_csv(os.path.join(out_dir, "regions.csv"), index=False)
    eng.areas.to_csv(os.path.join(out_dir, "areas_radius.csv"), index=False)
    eng.area_curves.to_csv(os.path.join(out_dir, "area_radius_curves.csv"), index=False)
    eng.Z.to_csv(os.path.join(out_dir, "zip_to_region.csv"), index=False)
    eng.tuning.to_csv(os.path.join(out_dir, "validation_tuning.csv"), index=False)
    eng.bt_summary.to_csv(os.path.join(out_dir, "backtest_summary.csv"), index=False)
    eng.bt_segments.to_csv(os.path.join(out_dir, "backtest_by_segment.csv"), index=False)
    eng.calib.to_csv(os.path.join(out_dir, "calibration_test.csv"), index=False)
    eng.brier.to_csv(os.path.join(out_dir, "brier_test.csv"), index=False)
    if do_capacity:
        eng.capacity.to_csv(os.path.join(out_dir, "capacity_simulation.csv"), index=False)
    eng.f4_log.to_csv(os.path.join(out_dir, "daily_release_log_sample.csv"), index=False)
    if hasattr(eng, "pool_compare"):
        eng.pool_compare.to_csv(os.path.join(out_dir, "resale_reach_by_state.csv"), index=False)
    eng.time_curve.to_csv(os.path.join(out_dir, "holding_time_curve.csv"), index=False)
    if hasattr(eng, "radius_curve"):
        eng.radius_curve.to_csv(os.path.join(out_dir, "radius_value_curve.csv"), index=False)
    summ = eng.product_region_summary()
    summ.to_csv(os.path.join(out_dir, "product_region_summary.csv"), index=False)
    eng.summary = summ
    rep = dict(costs=asdict(cc) | dict(status_quo=cc.status_quo, one_time=cc.one_time, per_day=cc.per_day,
                                        breakeven_flat=cc.breakeven_flat(), stop_hazard=cc.stop_hazard),
               config={k: (list(v) if isinstance(v, tuple) else v) for k, v in asdict(cfg).items()},
               data=ds.notes, demand_params=eng.params,
               resale_pool=dict(mode=cfg.resale_pool, resale_radius_km=cfg.resale_radius_km,
                                pool_cap_km=cfg.pool_cap_km, max_hold_days=cfg.max_hold_days,
                                lost_rule=cfg.apply_lost_rule,
                                median_max_hold_days=float(np.median(eng.max_hold[ds.E.is_anchor.values]))),
               geography={k: v for k, v in eng.geo_info.items() if k != "eps_table"},
               backtest=eng.bt_summary.round(4).to_dict(orient="records"), runtime_s=round(time.time() - t0, 1))
    with open(os.path.join(out_dir, "run_report.json"), "w") as f:
        json.dump(rep, f, indent=2, default=str)
    if verbose:
        print(f"[done] {time.time() - t0:.0f}s → {out_dir}")
    return eng
