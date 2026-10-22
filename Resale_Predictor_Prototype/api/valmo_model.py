"""Valmo-SAVE v2.2 — inference for one returned (RTO) unit.

This is the prediction path of the notebook's engine (`salvage_v2.SalvageEngine.recommend`), using the
trained parameters exported from it (model_bundle.npz). Nothing is re-estimated here:
  demand    λ(p, pool) ~ Gamma–Poisson empirical-Bayes posterior over every order of product p
            within 70 km of the hub (recency half-life 30 d), shrunk to the product's national rate
            × the pool's share of the category
  curve     P(sold by day t) = 1 − (1 + λt/k)^(−k),  k = 1 / (1/a + φ)
  calibrate Λ_cal(t) = e^a · Λ(t)^b on the cumulative hazard Λ = −log(1 − P)
  policy    E[C](T) = 50 + 25 + (10/30)·E[days held] + 120·(1 − P(T)),  T ≤ min(21, 45-day room)
            HOLD if min_T E[C](T) < 170
  stock cap the n-th unit is held only while P(n nearby orders by T) still beats ₹170
Only numpy is needed.
"""
from __future__ import annotations

import json
import os

import numpy as np

EARTH_KM = 6371.0
HERE = os.path.dirname(os.path.abspath(__file__))


def _haversine(lat1, lon1, lat2, lon2):
    """km between one point (radians) and arrays of points (radians) — same formula as the engine."""
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * EARTH_KM * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


class ValmoModel:
    def __init__(self, bundle=os.path.join(HERE, 'model_bundle.npz')):
        b = np.load(bundle)
        self.b = {k: b[k] for k in b.files}
        meta = json.load(open(bundle.replace('.npz', '_meta.json')))
        self.meta = meta
        self.product_ids = meta['product_id']
        self.pid_of = {p: i for i, p in enumerate(self.product_ids)}
        self.K = int(self.b['K'])
        B = self.b
        self.hub_lat_r, self.hub_lon_r = np.radians(B['hub_lat']), np.radians(B['hub_lon'])
        self.zip_lat_r, self.zip_lon_r = np.radians(B['zip_lat']), np.radians(B['zip_lon'])
        self.zip_index = {int(z): i for i, z in enumerate(B['zip_code'])}

    # ---------------- locating the hub ----------------
    def region_of_point(self, lat, lon) -> int:
        d = _haversine(np.radians(lat), np.radians(lon), self.zip_lat_r, self.zip_lon_r)
        return int(self.b['zip_region'][int(np.argmin(d))])

    def region_of_zip(self, zip5: int):
        i = self.zip_index.get(int(zip5))
        return None if i is None else int(self.b['zip_region'][i])

    # ---------------- demand model ----------------
    def _params(self, p: int, r: int):
        B = self.b
        s, e = int(B['st'][p]), int(B['en'][p])
        zz, ww = B['z_row'][s:e], B['w_row'][s:e]
        d = _haversine(self.hub_lat_r[r], self.hub_lon_r[r], self.zip_lat_r[zz], self.zip_lon_r[zz])
        inpool = d <= float(B['pool_radius_km'])
        n = float(ww[inpool].sum())                              # recency-weighted orders inside the pool
        c = int(B['prod_cat'][p])
        beta, alpha, phi, Ew = float(B['beta']), float(B['alpha']), float(B['phi']), float(B['Ew'])
        share = (B['hub_cat'][r, c] + beta * B['pool_share'][r]) / (B['n_c'][c] + beta)
        mu = B['n_p'][p] / Ew * share
        a = n + alpha
        lam = a / (Ew + alpha / mu) if mu > 0 else 0.0
        k = 1.0 / (1.0 / a + phi)
        return float(lam), float(k), n, int(inpool.sum())

    def _cal(self, F):
        a, b = float(self.b['cal_a']), float(self.b['cal_b'])
        Lam = -np.log(np.clip(1 - F, 1e-12, 1))
        G = 1 - np.exp(-np.exp(a) * np.clip(Lam, 0, None) ** b)
        G[..., 0] = 0.0
        return G

    def _cost_curve(self, F):
        B = self.b
        S = 1.0 - F
        EH = np.concatenate([np.zeros(S.shape[:-1] + (1,)), np.cumsum(S[..., :-1], axis=-1)], axis=-1)
        C = B['forward'] + B['one_time'] + B['per_day'] * EH + B['reverse'] * S
        C[..., 0] = B['status_quo']
        return C, EH

    def _policy(self, F, cap):
        sq = float(self.b['status_quo'])
        C, EH = self._cost_curve(F)
        tt = np.arange(F.shape[-1])
        C = np.where((tt > cap) & (tt > 0), np.inf, C)
        T = int(np.argmin(C, axis=-1)) if F.ndim == 1 else C.argmin(-1)
        return C, EH, T

    # ---------------- recommendation ----------------
    def recommend(self, product_id: str, region: int) -> dict:
        B, K = self.b, self.K
        sq = float(B['status_quo'])
        p = self.pid_of[product_id]
        lam, k, n, n_rows = self._params(p, region)
        t = np.arange(K + 1)
        F = self._cal(1 - (1 + lam * t / k) ** (-k))
        cap = int(B['hub_cap'][region])
        C, EH, T = self._policy(F, cap)
        cmin = float(C[T])
        hold = bool(T > 0 and cmin < sq)
        below = C[1:] < sq
        be_day = int(below.argmax() + 1) if below.any() else -1
        likely = int(np.diff(F).argmax() + 1)
        med = int((F >= 0.5).argmax()) if (F >= 0.5).any() else -1
        req = (B['one_time'] + B['per_day'] * EH) / B['reverse']          # P needed by day T to beat ₹170
        Tshow = T if hold else 0
        return dict(
            product_id=product_id, category=self.meta['category'][int(B['prod_cat'][p])],
            hub=self.meta['hub_name'][region], hub_region=int(region), hub_state=self.meta['hub_state'][region],
            hub_lat=float(B['hub_lat'][region]), hub_lon=float(B['hub_lon'][region]),
            resale_radius_km=float(B['pool_radius_km']), max_hold_days=cap,
            decision='HOLD' if hold else 'RETURN',
            hold_until_day=int(Tshow), p_sold_by_hold_until=float(F[T]) if hold else 0.0,
            p_sold_by_cap=float(F[cap]), best_case_cost=float(np.min(C[1:cap + 1])) if cap > 0 else sq,
            breakeven_day=be_day, most_likely_day=likely, median_day=med,
            expected_cost=cmin if hold else sq, status_quo=sq,
            expected_saving=(sq - cmin) if hold else 0.0,
            demand_per_month=lam * 30, weighted_orders_in_pool=n, product_orders_total=int(B['product_orders'][p]),
            stock_cap_units=self.stock_cap(lam, k, F, cap) if hold else 0,
            curve=dict(day=t[:cap + 1].tolist(), p_sold=F[:cap + 1].round(4).tolist(),
                       p_required=np.asarray(req[:cap + 1], float).round(4).tolist(),
                       expected_cost=np.where(np.isfinite(C[:cap + 1]), C[:cap + 1], None).tolist()),
        )

    def stock_cap(self, lam, k, Fcal, cap) -> int:
        """Most units of this product worth holding at once (k-th unit rule, as product_region_summary)."""
        B, K, U = self.b, self.K, int(self.b['max_units'])
        t = np.arange(K + 1)
        q = k / (k + lam * t)                                      # NB(k, q) with mean λt
        pmf = np.zeros((U, K + 1))
        pmf[0] = q ** k
        for x in range(1, U):
            pmf[x] = pmf[x - 1] * (x - 1 + k) / x * (1 - q)
        cdf = np.cumsum(pmf, axis=0)                              # P(X ≤ x)
        Fn = 1 - cdf                                              # F_u(t) = P(X ≥ u) = 1 − P(X ≤ u−1), u = 1..U
        F1 = 1 - (1 + lam * t / k) ** (-k)
        ratio = np.where(F1 > 1e-9, Fcal / np.maximum(F1, 1e-9), 1.0)
        Fu = np.clip(np.nan_to_num(Fn) * ratio[None, :], 0, 1)
        sq = float(B['status_quo'])
        C, _ = self._cost_curve(Fu)
        C = np.where((t[None, :] > cap) & (t[None, :] > 0), np.inf, C)
        T = C.argmin(-1)
        cmin = C[np.arange(U), T]
        hold = (T > 0) & (cmin < sq)
        return int(U if hold.all() else hold.argmin())
