"""Export the trained Valmo-SAVE v2.2 engine (the notebook's `model_eng`) into a compact bundle for the website.
Run once, with salvage_v2.py importable and the fitted engine pickle available:
    python tools/export_bundle.py <engine.pkl> api/model_bundle.npz
"""
import json, os, pickle, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import salvage_v2  # noqa: F401  (needed to unpickle the engine)

eng = pickle.load(open(sys.argv[1], 'rb'))
out = sys.argv[2]
m, cc, E = eng.prod_model, eng.cc, eng.ds.E
P = eng.ds.products
assert type(m).__name__ == 'PoolDemandModel' and eng.cfg.resale_pool == 'radius'
R = eng.R.set_index('region').loc[np.arange(eng.nR)].reset_index()
Z = eng.Z
orders = np.bincount(E.pid.values, minlength=len(P))
cats = list(eng.ds.categories)
cat_en = (P.groupby('cat').category_english.first().reindex(range(len(cats))).fillna('unknown').values)

np.savez_compressed(
    out,
    # demand model (Gamma–Poisson, empirical Bayes, fitted on all data up to the last order)
    alpha=m.alpha, phi=m.phi, beta=m.beta, Ew=m.Ew,
    n_p=m.n_p, n_c=m.n_c, prod_cat=P.cat.values.astype(np.int16), hub_cat=m.hub_cat.astype(np.float64),
    pool_share=m.pool_share, z_row=m._z.astype(np.int32), w_row=m._w, st=m._st.astype(np.int32), en=m._en.astype(np.int32),
    # resale pool geometry (any buyer within 70 km of the hub)
    pool_radius_km=float(eng.cfg.resale_radius_km),
    hub_lat=R.lat.values, hub_lon=R.lon.values, hub_radius_km=R.R_area.values, hub_cap=eng.hub_cap.astype(np.int16),
    hub_orders_per_day=R.orders_per_day.values,
    zip_code=Z.zip.values.astype(np.int32), zip_lat=Z.lat.values, zip_lon=Z.lon.values, zip_region=Z.region.values.astype(np.int32),
    # calibration (cumulative-hazard map) and policy constants
    cal_a=eng.cal.a, cal_b=eng.cal.b, K=eng.K, max_units=eng.cfg.max_units,
    forward=cc.forward, reverse=cc.reverse, one_time=cc.one_time, per_day=cc.per_day, status_quo=cc.status_quo,
    product_orders=orders.astype(np.int32),
)
meta = dict(
    product_id=P.product_id.tolist(), category=cat_en.tolist(),
    hub_name=R.name.tolist(), hub_state=[str(s) for s in eng.hub_state_real],
    zip_city=Z.city.tolist(), zip_state=Z.state.tolist(),
    data_window=[str(E.order_purchase_timestamp.min().date()), str(eng.ds.data_end.date())],
    params=eng.params, backtest=eng.bt_summary.set_index('policy').loc['model (calibrated)'][
        ['returns', 'hold_rate', 'resale_rate_on_hold', 'saving_per_return']].astype(float).to_dict(),
)
json.dump(meta, open(out.replace('.npz', '_meta.json'), 'w'))
print('ok', len(P), 'products', eng.nR, 'hubs', len(Z), 'zips')
