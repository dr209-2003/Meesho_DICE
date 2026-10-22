"""Check the website's model against the notebook engine (salvage_v2 + trained pickle)."""
import os, pickle, sys, numpy as np, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, 'api')
import salvage_v2
from valmo_model import ValmoModel
e = pickle.load(open(sys.argv[1], 'rb'))
vm = ValmoModel()
rng = np.random.default_rng(7)
P = e.ds.products
pop = np.argsort(-vm.b['product_orders'])[:200]
busy = np.argsort(-e.R.orders_per_day.values)[:30]
pids = np.r_[rng.choice(pop, 400), rng.integers(0, len(P), 200)]
regs = np.r_[rng.choice(busy, 400), rng.integers(0, e.nR, 200)]
keys = ['decision', 'hold_until_day', 'p_sold_by_hold_until', 'breakeven_day', 'most_likely_day', 'median_day',
        'expected_cost', 'expected_saving', 'demand_per_month', 'max_hold_days', 'category', 'region']
bad = holds = capbad = 0
m = e.prod_model
for p, r in zip(pids, regs):
    pid = P.product_id.values[p]
    lat, lon = e.R.set_index('region').loc[r, ['lat', 'lon']]
    ref = e.recommend(pid, float(lat), float(lon))
    rr = vm.region_of_point(float(lat), float(lon))
    got = vm.recommend(pid, rr); got['region'] = got['hub']
    for k_ in keys:
        a, b = ref[k_], got[k_]
        ok = a == b if isinstance(a, str) else abs(float(a) - float(b)) <= 1e-6 * max(1, abs(float(a)))
        if not ok:
            bad += 1; print('MISMATCH', pid, rr, k_, a, b); break
    if got['decision'] == 'HOLD':
        holds += 1
        Fn = m.unit_curve(np.array([p]), np.array([rr]), e.cfg.max_units, e.K)
        F1 = m.curve(np.array([p]), np.array([rr]), e.K)[0]
        ratio = np.where(F1 > 1e-9, e.cal(F1) / np.maximum(F1, 1e-9), 1.0)
        hn = salvage_v2.policy_from_curve(np.clip(Fn * ratio[:, None, :], 0, 1), e.cc, cap=e.hub_cap[[rr]])['hold']
        capref = int(np.where(hn.all(1), e.cfg.max_units, hn.argmin(1))[0])
        capbad += capref != got['stock_cap_units']
print(f'pairs {len(pids)} | HOLD {holds} | field mismatches {bad} | stock-cap mismatches {capbad}')
