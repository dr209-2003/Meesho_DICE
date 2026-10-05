import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SKUS } from '../../data/skus';
import { decide, chanceColor, DECISION_STYLE, POLICY } from '../../lib/engine';
import { useApp } from '../../state/AppState';
import { Card, Pill, Bar, Legend } from '../ui/Primitives';
import { CurveBars } from '../charts/SkuCharts';
import { rupee } from '../../lib/format';

/** Decisions for every SKU, honouring per-SKU hold-day overrides */
export function useDecisions() {
  const { state } = useApp();
  return useMemo(
    () => SKUS.map((s) => ({ sku: s, d: decide(s, state.overrides[s.id] ?? POLICY.capDays) })),
    [state.overrides],
  );
}

export function SkuTable({ rows, selected, onSelect }) {
  const nav = useNavigate();
  return (
    <div className="table-wrap">
      <table className="data" style={{ minWidth: 820 }}>
        <thead>
          <tr>
            <th>Product / SKU</th>
            <th className="num">Failed</th>
            <th>Retain · RTO</th>
            <th>Decision</th>
            <th>Hold window<small>50% sold → max</small></th>
            <th>Resale<small>by max day</small></th>
            <th className="num">Shelf / cap</th>
            <th className="num">Saving<small>per unit</small></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan="8" className="empty">No SKUs match.</td></tr>}
          {rows.map(({ sku, d }) => {
            const lo = d.hold ? d.median || d.Ts : 0;
            return (
              <tr key={sku.id} className={'click' + (selected === sku.id ? ' sel' : '')}
                onClick={() => (onSelect ? onSelect(sku.id) : nav(`/sku/${sku.id}`))}
                onDoubleClick={() => nav(`/sku/${sku.id}`)}>
                <td style={{ maxWidth: 240 }}>
                  <div className="row">
                    <span className="swatch" style={{ background: sku.color }}>{sku.ini}</span>
                    <div className="grow">
                      <Link to={`/sku/${sku.id}`} onClick={(e) => e.stopPropagation()} className="ell" style={{ display: 'block', fontWeight: 600, color: 'var(--ink)' }}>{sku.name}</Link>
                      <div className="sub ell">{sku.id} · {sku.cat}</div>
                    </div>
                  </div>
                </td>
                <td className="num" style={{ fontWeight: 700, fontSize: 14 }}>{sku.failed}</td>
                <td>
                  <div style={{ display: 'flex', width: 104, height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--orange)' }}>
                    <div style={{ width: (d.retain / sku.failed) * 100 + '%', background: 'var(--teal)' }} />
                  </div>
                  <div style={{ fontSize: 11.5, marginTop: 4 }}><b style={{ color: '#0b6e62' }}>{d.retain}</b> retain · <b style={{ color: '#a4501e' }}>{d.rto}</b> RTO</div>
                </td>
                <td><Pill {...pillOf(d.decision)}>{d.decision}</Pill></td>
                <td>
                  <div style={{ position: 'relative', width: 108, height: 8, borderRadius: 4, background: '#efeff5' }}>
                    {d.hold && <div style={{ position: 'absolute', top: 0, height: 8, borderRadius: 4, left: ((lo - 1) / 21) * 100 + '%', width: ((d.Ts - lo + 1) / 21) * 100 + '%', background: 'linear-gradient(90deg, var(--violet), var(--brand-pink))' }} />}
                    {d.hold && d.median > 0 && <div style={{ position: 'absolute', top: -3, left: `calc(${((lo - 0.5) / 21) * 100}% - 7px)`, width: 14, height: 14, borderRadius: 7, border: '3px solid #fff', boxShadow: '0 0 0 1px var(--violet)', background: 'var(--violet)' }} />}
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 4 }}>{d.hold ? (d.median ? `day ${d.median} → day ${d.Ts}` : `slow → day ${d.Ts}`) : 'return now'}</div>
                </td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <Bar value={d.p} color={chanceColor(d.p)} style={{ width: 66 }} />
                    <b style={{ color: chanceColor(d.p) }}>{Math.round(d.p * 100)}%</b>
                  </div>
                </td>
                <td className="num" style={{ fontWeight: 600 }}>{d.hold ? `${sku.shelf + d.retain} / ${d.cap}` : '—'}</td>
                <td className="num"><b style={{ color: d.saving >= 60 ? 'var(--green)' : d.saving > 0 ? '#8a5a00' : 'var(--grey)' }}>{rupee(d.saving)}</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const pillOf = (decision) => ({ bg: DECISION_STYLE[decision].background, fg: DECISION_STYLE[decision].color });

export function whyText(sku, d) {
  return d.hold
    ? `${d.orders30} orders for this product within 70 km in the last 30 days. Holding up to ${d.Ts} days gives a ${Math.round(d.p * 100)}% chance of resale; expected cost ${rupee(d.cost)} vs ₹170 to return. ` +
      (d.retain < sku.failed ? `Only ${d.cap} units are worth holding at once (${sku.shelf} already on shelf), so ${d.rto} go back to the seller.` : `All ${sku.failed} failed units are retained.`)
    : `Only ${Math.max(1, d.orders30)} order(s) within 70 km in 30 days. Even after 21 days the resale chance is ${Math.round(d.F[21] * 100)}%, so holding would cost more than ₹170. Return to seller now.`;
}

export function SkuSidePanel({ sku, d }) {
  const zoneCols = ['var(--blue)', 'var(--violet)', 'var(--teal)', 'var(--amber)'];
  return (
    <Card>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="sub">{sku.id} · {sku.cat}</span>
        <Pill {...pillOf(d.decision)}>{d.decision}</Pill>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700 }}>{sku.name}</h2>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>{whyText(sku, d)}</p>
      <div className="two" style={{ gap: 8 }}>
        {[
          ['Holding pays from', d.hold ? `day ${d.breakEven}` : 'never', 'var(--teal-t)', '#0b5e54'],
          ['50% chance sold by', d.median ? `day ${d.median}` : 'not within 21 d', 'var(--violet-t)', '#4a23a3'],
          ['Expected cost', `${rupee(d.cost)} vs ₹170`, 'var(--orange-t)', '#8a3610'],
          ['Orders ≤ 70 km (30 d)', d.orders30, 'var(--blue-t)', '#2648a6'],
        ].map(([l, v, bg, fg]) => (
          <div key={l} style={{ padding: '9px 12px', borderRadius: 12, background: bg, color: fg }}>
            <div style={{ fontSize: 11.5, fontWeight: 600 }}>{l}</div>
            <b style={{ fontSize: 17 }}>{v}</b>
          </div>
        ))}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Chance it has resold, by day held</div>
        <CurveBars d={d} />
        <div style={{ marginTop: 6 }}><Legend items={[['var(--teal)', 'holding pays'], ['var(--amber)', 'not yet'], ['#E8396B', 'chance needed', true]]} /></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Where nearby buyers are</div>
        {sku.zones.slice(0, 4).map((z, j) => (
          <div key={z[0]} style={{ display: 'grid', gridTemplateColumns: '112px 1fr 92px', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span className="ell" style={{ fontWeight: 500 }}>{z[0]}</span>
            <Bar value={z[2] / 0.26} color={zoneCols[j]} />
            <span className="muted" style={{ textAlign: 'right' }}>{z[1]} km · {Math.round(z[2] * 100)}%</span>
          </div>
        ))}
      </div>
      <Link to={`/sku/${sku.id}`} className="btn btn-primary" style={{ width: '100%' }}>Open full SKU details ›</Link>
    </Card>
  );
}
