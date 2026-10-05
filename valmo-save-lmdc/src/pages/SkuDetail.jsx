import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SKUS, skuById } from '../data/skus';
import { FEATURED } from '../data/dispatch';
import { decide, POLICY } from '../lib/engine';
import { buildUnits, buyersFor, journeyFor, STATUS } from '../lib/units';
import { useApp } from '../state/AppState';
import { Card, PageHead, Pill, Bar, Legend } from '../components/ui/Primitives';
import { IconStore, IconUser } from '../components/ui/Icons';
import { ResaleCurve, RingMap } from '../components/charts/SkuCharts';
import { pillOf } from '../components/panels/SkuPanels';
import { rupee, fmt } from '../lib/format';
import NotFound from './NotFound';

function ProductImage({ sku }) {
  if (sku.id === 'MS-KR-20431') {
    return (
      <svg viewBox="0 0 200 240" style={{ width: '78%' }} role="img" aria-label="Navy A-line kurta (image placeholder)">
        <path d="M70 20 Q100 34 130 20 L160 32 L182 94 L160 102 L150 72 L154 222 Q100 234 46 222 L50 72 L40 102 L18 94 L40 32 Z" fill="#1E3A6E" />
        <path d="M86 22 Q100 52 114 22" fill="none" stroke="#FDEFF8" strokeWidth="3" />
        <path d="M100 44 L100 92" stroke="#F5A623" strokeWidth="2.5" />
        <path d="M62 120 Q100 128 138 120 M58 160 Q100 168 142 160 M52 200 Q100 210 148 200" fill="none" stroke="#F5A623" strokeWidth="2.2" strokeDasharray="3 5" />
      </svg>
    );
  }
  return <span style={{ width: 96, height: 96, borderRadius: 28, background: sku.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 34, fontWeight: 700 }}>{sku.ini}</span>;
}

export default function SkuDetail() {
  const { skuId } = useParams();
  const nav = useNavigate();
  const { state, dispatch, toast } = useApp();
  const [showAll, setShowAll] = useState(false);
  const sku = skuById(skuId);
  if (!sku) return <NotFound />;

  const maxDays = state.overrides[sku.id] ?? POLICY.capDays;
  const d = decide(sku, maxDays);
  const returned = !!state.returned[sku.id];
  const feat = FEATURED.find((f) => f.skuId === sku.id);
  const units = buildUnits(sku, d, state.dispatch, returned);
  const onShelf = units.filter((u) => !u.rto && !['sent'].includes(u.status) && u.status !== 'returning').length;
  const shown = showAll ? units : units.slice(0, 8);
  const buyers = buyersFor(sku);
  const journey = journeyFor(sku, d, state.dispatch);
  const idx = SKUS.findIndex((s) => s.id === sku.id);
  const prev = SKUS[(idx + SKUS.length - 1) % SKUS.length];
  const next = SKUS[(idx + 1) % SKUS.length];
  const h = sku.history;
  const net = Math.round(h.resold * (170 - 75 - POLICY.holdPerDay * h.avgDays) - h.capped * (25 + 7));
  const sentToday = feat && state.dispatch[feat.id] === 'sent' ? 1 : 0;
  const T = d.hold ? d.Ts : maxDays;

  return (
    <div className="page">
      <PageHead crumbs={[{ label: 'Overview', to: '/' }, { label: 'RTO & Retain', to: '/rto' }, { label: sku.id }]} title={sku.title}>
        <label className="search" style={{ minWidth: 0 }}>
          <span className="sub" style={{ whiteSpace: 'nowrap' }}>SKU</span>
          <select value={sku.id} onChange={(e) => nav(`/sku/${e.target.value}`)} style={{ border: 0, outline: 0, font: 'inherit', fontSize: 13, background: 'transparent', maxWidth: 240 }} aria-label="Switch SKU">
            {SKUS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <Link to={`/sku/${prev.id}`} className="btn btn-ghost" aria-label="Previous SKU">‹</Link>
        <Link to={`/sku/${next.id}`} className="btn btn-ghost" aria-label="Next SKU">›</Link>
        <Link to="/rto" className="btn btn-outline">Back to all SKUs</Link>
      </PageHead>

      <div className="sku-layout">
        {/* ---------------- column 1: product, seller, buyers */}
        <div className="col">
          <Card>
            <div className="row wrap" style={{ alignItems: 'stretch', gap: 14 }}>
              <div style={{ position: 'relative', width: 168, minHeight: 196, flex: 'none', borderRadius: 14, background: 'linear-gradient(160deg, var(--brand-tint), var(--blue-t))', display: 'grid', placeItems: 'center' }}>
                <ProductImage sku={sku} />
                <span style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 10, color: 'var(--muted)', background: '#fff', padding: '2px 7px', borderRadius: 6 }}>image placeholder</span>
              </div>
              <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="chip" style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}>{sku.cat} › {sku.sub}</span>
                  {sku.attrs.map((a, i) => <span key={a} className="chip" style={{ background: ['var(--blue-t)', '#efeff5', 'var(--amber-t)'][i], color: ['#2648a6', 'var(--ink)', '#7a5200'][i] }}>{a}</span>)}
                </div>
                <div className="row" style={{ alignItems: 'baseline' }}>
                  <b style={{ fontSize: 28 }}>₹{sku.price}</b>
                  <span className="muted" style={{ textDecoration: 'line-through' }}>₹{fmt(sku.mrp)}</span>
                  <b style={{ color: 'var(--green)', fontSize: 13 }}>{Math.round((1 - sku.price / sku.mrp) * 100)}% off</b>
                </div>
                <div className="row">
                  <span className="pill" style={{ background: 'var(--green)', color: '#fff', fontSize: 13 }}>{sku.rating} ★</span>
                  <span className="sub">{fmt(sku.ratings)} ratings</span>
                </div>
                <div className="sub">Seller: <b style={{ color: 'var(--ink)' }}>{sku.seller.name}</b></div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {[['SKU ID', sku.id], ['Catalog ID', sku.catalog], ['Material', sku.fabric], ['Packed weight', sku.weight], ['Package', sku.pack], ['HSN', sku.hsn]].map(([l, v]) => (
                <div key={l} style={{ padding: '8px 11px', borderRadius: 10, background: 'var(--bg)' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div><b className="ell" style={{ display: 'block', fontSize: 13 }}>{v}</b>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>This SKU with Valmo-SAVE · last 30 days</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {[['Retained', h.retained, 'var(--teal-t)', '#0b5e54'], ['Re-sold', h.resold, 'var(--violet-t)', '#4a23a3'], ['Hit 21-day cap', h.capped, 'var(--orange-t)', '#8a3610'], ['Net saved', rupee(Math.max(0, net)), 'var(--green-t)', '#026a4b']].map(([l, v, bg, fg]) => (
                  <div key={l} style={{ padding: '8px 10px', borderRadius: 10, background: bg, color: fg }}>
                    <div style={{ fontSize: 10.5, fontWeight: 600 }}>{l}</div><b style={{ fontSize: 17 }}>{v}</b>
                  </div>
                ))}
              </div>
              {h.resold > 0 && <div className="sub" style={{ marginTop: 6 }}>Re-sold units sat {h.avgDays} days on average</div>}
            </div>
          </Card>

          <Card>
            <div className="row">
              <span className="kpi-ico" style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--amber), var(--orange))', color: '#fff' }}><IconStore /></span>
              <div className="grow"><div className="lbl">Seller</div><b style={{ fontSize: 15 }}>{sku.seller.name}</b></div>
              <span className="chip" style={{ background: 'var(--teal-t)', color: '#0b5e54' }}>✓ Valmo-SAVE opted in</span>
            </div>
            <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: '130px 1fr', gap: '7px 10px', fontSize: 12.5 }}>
              <dt className="muted">Seller ID</dt><dd style={{ margin: 0, fontWeight: 600 }}>{sku.seller.id}</dd>
              <dt className="muted">Pickup</dt><dd style={{ margin: 0, fontWeight: 600 }}>{sku.seller.city}</dd>
              <dt className="muted">Rating</dt><dd style={{ margin: 0, fontWeight: 600 }}>{sku.seller.rating} ★ · since {sku.seller.since}</dd>
              <dt className="muted">RTO rate (90 d)</dt><dd style={{ margin: 0, fontWeight: 700, color: '#b4325b' }}>{(sku.seller.rtoRate * 100).toFixed(1)}%</dd>
              <dt className="muted">Reverse lane</dt><dd style={{ margin: 0, fontWeight: 600 }}>{sku.seller.lane}</dd>
            </dl>
          </Card>

          <Card>
            <div className="row">
              <span className="kpi-ico" style={{ width: 40, height: 40, background: 'linear-gradient(135deg, var(--sky), var(--violet))', color: '#fff' }}><IconUser /></span>
              <div className="grow"><div className="lbl">Buyers of unit {buyers.unit}</div><b style={{ fontSize: 15 }}>{buyers.resold ? 'Failed once, re-sold today' : 'Failed · waiting for a nearby buyer'}</b></div>
            </div>
            <div className="two" style={{ gap: 10 }}>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--orange-t)', color: '#4a2410', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className="lbl" style={{ color: '#a4501e' }}>Failed order</span>
                <b style={{ fontSize: 13.5 }}>{buyers.failed.name} · {buyers.failed.order}</b>
                <span>{buyers.failed.area}</span><span>{buyers.failed.pay}</span><span>{buyers.failed.note}</span>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: buyers.resold ? 'var(--teal-t)' : '#f4f4f8', color: buyers.resold ? '#08443d' : 'var(--ink-2)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className="lbl" style={{ color: buyers.resold ? '#0b6e62' : 'var(--muted)' }}>Re-sold to</span>
                {buyers.resold ? (
                  <><b style={{ fontSize: 13.5 }}>{buyers.resold.name} · {buyers.resold.order}</b><span>{buyers.resold.area}</span><span>{buyers.resold.pay}</span><span>{buyers.resold.note}</span></>
                ) : (
                  <><b style={{ fontSize: 13.5 }}>Not yet</b><span>{d.hold ? `50% chance by day ${d.median || '—'}` : 'Returning to seller'}</span><span>{d.orders30} orders / 30 d within 70 km</span></>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* ---------------- column 2: decision, numbers, curve, map */}
        <div className="col">
          <section className="banner" aria-label="Valmo-SAVE decision">
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 700, flex: 'none' }}>↺</div>
            <div className="grow" style={{ minWidth: 220 }}>
              <div className="lbl" style={{ color: '#ffd3ec' }}>Valmo-SAVE decision · today</div>
              <b style={{ fontSize: 21, display: 'block', margin: '2px 0' }}>
                {returned ? `RETURN ALL ${sku.failed + sku.shelf} · moved to seller bay` : d.hold ? (d.retain ? `RETAIN ${d.retain} · RETURN ${d.rto} · hold up to ${d.Ts} days` : `CAP FULL · RETURN ${d.rto} · shelf already holds ${sku.shelf} of ${d.cap}`) : `RETURN ALL ${sku.failed} TO SELLER`}
              </b>
              <span style={{ fontSize: 13, color: '#fde3f2' }}>
                {d.hold ? `${Math.round(d.p * 100)}% resale chance within 70 km · saves ${rupee(d.saving)} / unit · cap ${d.cap} units` : `Only ${Math.round(d.F[21] * 100)}% resale chance in 21 days — holding costs more than ₹170`}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>
                Max hold days: <b>{maxDays}</b>{maxDays !== POLICY.capDays && <button className="btn btn-sm" style={{ height: 22, marginLeft: 8, background: 'rgba(255,255,255,.2)', color: '#fff', padding: '0 8px' }} onClick={() => dispatch({ type: 'override', id: sku.id, days: POLICY.capDays })}>reset</button>}
                <input className="range" type="range" min="1" max="21" value={maxDays} onChange={(e) => dispatch({ type: 'override', id: sku.id, days: Number(e.target.value) })} style={{ accentColor: '#fff' }} />
              </label>
              <button className="btn btn-sm" style={{ background: '#fff', color: 'var(--brand)' }} disabled={returned}
                onClick={() => { dispatch({ type: 'returnAll', id: sku.id, name: sku.name }); toast(`${sku.ini}: shelf units moved to the seller return bay`); }}>
                {returned ? 'Returned to seller ✓' : 'Return all to seller'}
              </button>
            </div>
          </section>

          <section style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            {[
              ['Failed today', sku.failed, `${d.retain} retained · ${d.rto} RTO`, 'var(--rose-t)', '#8e1d43'],
              ['On shelf / cap', d.hold ? `${sku.shelf + d.retain} / ${d.cap}` : `${sku.shelf} / 0`, d.hold && sku.shelf + d.retain >= d.cap ? 'cap full → next failures RTO' : 'room for more units', 'var(--amber-t)', '#7a5200'],
              ['Re-sold today', feat ? 1 : 0, feat ? (sentToday ? `sent → Delhi South LMSC` : `${feat.order} · send by 14:15`) : 'no nearby order yet', 'var(--teal-t)', '#0b5e54'],
              ['Orders ≤ 70 km (30 d)', d.orders30, 'other customers only', 'var(--blue-t)', '#2648a6'],
              ['Holding pays from', d.hold ? `day ${d.breakEven}` : 'never', d.median ? `50% sold by day ${d.median}` : 'slow seller', 'var(--violet-t)', '#4a23a3'],
              ['Expected cost', rupee(d.cost), `vs ₹170 · saves ${rupee(d.saving)} / unit`, 'var(--green-t)', '#026a4b'],
            ].map(([l, v, s, bg, fg]) => (
              <div key={l} className="tile" style={{ background: bg, color: fg }}>
                <div className="tile-body"><span className="tile-lbl">{l}</span><b className="tile-val" style={{ fontSize: 22 }}>{v}</b><span className="tile-sub ell">{s}</span></div>
              </div>
            ))}
          </section>

          <Card title="Chance a retained unit has resold, by day held" sub={`From ${d.orders30} orders within 70 km in 30 days · drag “Max hold days” above to see the trade-off`}
>
            <ResaleCurve d={d} maxDays={T} />
            <Legend items={[['#9F2089', 'chance it has resold'], ['#E8396B', 'chance needed for holding to pay', true], ['#FEF3DC', 'before break-even'], ['#E4E4EC', 'beyond your hold limit']]} />
          </Card>

          <Card>
            <div className="row wrap" style={{ gap: 18, alignItems: 'center' }}>
              <RingMap zones={sku.zones} highlight={feat ? { zone: sku.zones.find((z) => feat.area.startsWith(z[0]))?.[0], label: `${feat.order} · re-sold` } : null} />
              <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 220 }}>
                <div><h2 className="card-title">Where buyers of this SKU are</h2><div className="sub">Last 90 days · orange square = this hub</div></div>
                {sku.zones.map(([name, km, share], i) => (
                  <div key={name}>
                    <div className="row" style={{ justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span className="row" style={{ gap: 6, fontWeight: 600 }}><span className="dot" style={{ background: ['#E8396B', '#7B3FE4', '#3D6CE0', '#F5A623', '#0E9F8E', '#2BA6DE'][i], borderRadius: 5 }} />{name}</span>
                      <span className="muted">{km} km · <b style={{ color: 'var(--ink)' }}>{Math.round(share * 100)}%</b></span>
                    </div>
                    <Bar value={share / 0.26} height={7} color={['#E8396B', '#7B3FE4', '#3D6CE0', '#F5A623', '#0E9F8E', '#2BA6DE'][i]} style={{ marginTop: 4 }} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ---------------- column 3: units and journey */}
        <div className="col">
          <Card title="Units of this SKU at the hub" sub={`${onShelf} on shelf${d.hold ? ` (cap ${d.cap})` : ''} · ${sentToday} sent today · ${d.rto} returning`}
            right={<button className="btn btn-ghost btn-sm" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : `Show all ${units.length}`}</button>}>
            <div className="table-wrap">
              <table className="data" style={{ minWidth: 500 }}>
                <thead><tr><th>AWB</th><th>Failed</th><th>Days held (of 21)</th><th>Return by</th><th>Status</th></tr></thead>
                <tbody>
                  {shown.map((u) => (
                    <tr key={u.awb} className={u.highlight ? 'sel' : ''}>
                      <td><b style={{ fontSize: 12 }}>{u.awb}</b><div className="sub" style={{ fontSize: 10.5 }}>{u.reason}</div></td>
                      <td style={{ fontSize: 12 }}>{u.failedOn}</td>
                      <td><div className="row" style={{ gap: 6 }}><Bar value={Math.max(0.03, u.days / 21)} height={6} color={u.days >= 2 ? 'var(--violet)' : u.days === 1 ? 'var(--sky)' : 'var(--teal)'} style={{ flex: 1 }} /><b style={{ fontSize: 11.5, width: 16 }}>{u.days}</b></div></td>
                      <td style={{ fontSize: 12 }}>{u.returnBy}</td>
                      <td>{u.highlight && feat ? <Link to="/dispatch"><Pill bg={STATUS[u.status].bg} fg={STATUS[u.status].fg}>{STATUS[u.status].label}</Pill></Link> : <Pill bg={STATUS[u.status].bg} fg={STATUS[u.status].fg}>{STATUS[u.status].label}</Pill>}</td>
                    </tr>
                  ))}
                  {units.length === 0 && <tr><td colSpan="5" className="empty">No units at the hub.</td></tr>}
                </tbody>
              </table>
            </div>
            {!showAll && units.length > 8 && <span className="sub">+ {units.length - 8} more · FIFO: the oldest unit is matched to the next nearby order</span>}
          </Card>

          <Card title={`Journey of unit ${journey.unit}`}
            right={buyers.resold ? <span className="chip" style={{ background: 'var(--teal-t)', color: '#0b5e54' }}>Re-sold · saves {rupee(170 - 75 - POLICY.holdPerDay * 2)}</span> : <Pill {...pillOf(d.decision)}>{d.decision}</Pill>}>
            <div className="timeline">
              {journey.steps.map(([title, when, color], i) => (
                <div key={i} className="tl-row">
                  <div className="tl-rail">
                    <span className="tl-dot" style={{ background: color, boxShadow: `0 0 0 3px ${i === journey.steps.length - 1 ? '#f4f4f8' : '#fff'}` }} />
                    {i < journey.steps.length - 1 && <span className="tl-line" />}
                  </div>
                  <div className="tl-body">
                    <span style={{ fontSize: 12.5, fontWeight: i === journey.steps.length - 1 ? 500 : 600, color: i === journey.steps.length - 1 ? 'var(--muted)' : 'var(--ink)' }}>{title}</span>
                    <span className="sub" style={{ flex: 'none', fontWeight: 500 }}>{when}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
