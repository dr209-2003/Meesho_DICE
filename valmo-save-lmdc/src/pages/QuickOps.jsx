// LMDC side of the Meesho Quick integration: retain → QC → list, then fulfil the orders customers place.
// Everything here reads and writes the same shared store as the customer app.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHead, Pill, Tile, Ring } from '../components/ui/Primitives';
import { useShared } from '../shared/SharedStore';
import { PRODUCTS, RADIUS_KM, productById } from '../shared/catalog';
import { availableFor, eligibility } from '../shared/ops';
import { useApp } from '../state/AppState';

const DAY = 86400000;
const ST = {
  qc: ['Awaiting QC', 'var(--amber-t)', '#7a5200'],
  live: ['Live on Quick', 'var(--green-t)', '#026a4b'],
  reserved: ['Reserved', 'var(--blue-t)', '#2648a6'],
  sold: ['Sold', 'var(--violet-t)', '#4a23a3'],
  rto: ['Return to seller', 'var(--orange-t)', '#8a3610'],
};
const ORD = { placed: ['New', 'var(--rose-t)', '#8e1d43', 'Mark packed'], packed: ['Packed', 'var(--amber-t)', '#7a5200', 'Mark dispatched'], dispatched: ['Out for delivery', 'var(--violet-t)', '#4a23a3', 'Mark delivered'], delivered: ['Delivered', 'var(--green-t)', '#026a4b'], cancelled: ['Cancelled', '#efeff5', 'var(--ink-2)'] };
const ago = (t, now) => { const m = Math.round((now - t) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const time = (t) => new Date(t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });

function ModeBadge() {
  const { mode, sync, retry } = useShared();
  if (mode === 'loading') return <Pill bg="#efeff5" fg="var(--ink-2)">Connecting…</Pill>;
  if (mode === 'local') return <Pill bg="var(--amber-t)" fg="#7a5200">Demo mode · this browser only</Pill>;
  if (sync.error) return <button className="btn btn-ghost btn-sm" onClick={retry} style={{ color: 'var(--rose)' }}>Server unreachable · retry</button>;
  return <Pill bg="var(--green-t)" fg="#026a4b"><span className="live-dot" style={{ marginRight: 6 }} />Live shared store · synced {sync.at ? new Date(sync.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : ''}</Pill>;
}

function RetainRow({ p }) {
  const { state, run, avail } = useShared();
  const { toast } = useApp();
  const [variant, setVariant] = useState(p.options[0]);
  const [busy, setBusy] = useState(false);
  const el = eligibility(state, p.id);
  const doRetain = async () => {
    setBusy(true);
    try {
      const r = await run({ type: 'retain', skuId: p.id, variant });
      toast(`${r.unitId} retained · waiting for QC before it goes live`);
    } catch (e) { toast(e.message); }
    setBusy(false);
  };
  return (
    <tr>
      <td><b>{p.short}</b><div className="muted" style={{ fontSize: 11.5 }}>{p.id}</div></td>
      <td>{el.d.hold ? <Pill bg="var(--teal-t)" fg="#0b5e54">RETAIN</Pill> : <Pill bg="var(--orange-t)" fg="#8a3610">RTO</Pill>}</td>
      <td className="num">{el.d.hold ? `${el.held} / ${el.cap}` : '—'}</td>
      <td className="num">{availableFor(avail, p.id)}</td>
      <td>
        <select value={variant} onChange={(e) => setVariant(e.target.value)} aria-label={`${p.axis} for ${p.short}`} style={{ height: 32, borderRadius: 8, border: '1px solid var(--line-2)', padding: '0 8px', font: 'inherit', fontSize: 12.5 }} disabled={!el.ok}>
          {p.options.map((o) => <option key={o}>{o}</option>)}
        </select>
      </td>
      <td>
        <button className="btn btn-pink btn-sm" onClick={doRetain} disabled={!el.ok || busy} title={el.reason}>{busy ? 'Retaining…' : 'Retain 1 unit'}</button>
        <div className="muted" style={{ fontSize: 11, marginTop: 3, maxWidth: 220 }}>{el.reason}</div>
      </td>
    </tr>
  );
}

function QcRow({ u }) {
  const { run } = useShared();
  const { toast } = useApp();
  const [c, setC] = useState({ packaging: false, label: false, matches: false });
  const [busy, setBusy] = useState(false);
  const p = productById(u.skuId);
  const all = c.packaging && c.label && c.matches;
  const submit = async (pass) => {
    setBusy(true);
    try {
      const r = await run({ type: 'qc', unitId: u.id, checks: pass ? { packaging: true, label: true, matches: true } : c });
      toast(r.live ? `${u.id} passed QC · now live on Meesho Quick within ${RADIUS_KM} km` : `${u.id} failed QC · sent to the RTO line-haul`);
    } catch (e) { toast(e.message); }
    setBusy(false);
  };
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span><b>{u.id}</b> · {p.short} ({u.variant})</span>
        <span className="muted" style={{ fontSize: 12 }}>Rack {u.rack} · AWB {u.awb}</span>
      </div>
      <div className="row wrap" style={{ gap: 14, fontSize: 12.5 }}>
        {[['packaging', 'Packaging and seal intact'], ['label', 'Old label removed, hub tag applied'], ['matches', 'Product matches catalogue']].map(([k, l]) => (
          <label key={k} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={c[k]} onChange={(e) => setC((x) => ({ ...x, [k]: e.target.checked }))} />{l}
          </label>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary btn-sm" disabled={!all || busy} onClick={() => submit(true)}>Pass QC · list on Quick</button>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => submit(false)}>Fail QC · return to seller</button>
      </div>
    </div>
  );
}

function OrderRow({ o }) {
  const { run, state } = useShared();
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const s = ORD[o.status];
  const racks = o.items.flatMap((l) => (l.units || []).map((id) => state.units.find((u) => u.id === id))).filter(Boolean);
  const advance = async () => {
    setBusy(true);
    try { const r = await run({ type: 'advanceOrder', orderId: o.id }); toast(`${o.id} marked ${r.status}`); } catch (e) { toast(e.message); }
    setBusy(false);
  };
  return (
    <tr>
      <td><b>{o.id}</b><div className="muted" style={{ fontSize: 11.5 }}>{time(o.createdAt)}</div></td>
      <td>{o.items.map((l) => <div key={l.skuId + l.variant}>{l.qty}× {productById(l.skuId).short} <span className="muted">({l.variant})</span></div>)}</td>
      <td>{racks.map((u) => <div key={u.id} style={{ fontSize: 12 }}>{u.id} · {u.rack}</div>)}</td>
      <td>{o.address.area}<div className="muted" style={{ fontSize: 11.5 }}>{o.address.pin} · {o.address.km} km</div></td>
      <td>{o.payment.method === 'prepaid' ? 'Prepaid (sim.)' : 'COD'}<div className="muted" style={{ fontSize: 11.5 }}>₹{o.total}</div></td>
      <td><Pill bg={s[1]} fg={s[2]}>{s[0]}</Pill></td>
      <td>{s[3] ? <button className="btn btn-outline btn-sm" onClick={advance} disabled={busy}>{s[3]}</button> : <span className="muted">—</span>}</td>
    </tr>
  );
}

export default function QuickOps() {
  const { state, mode, run, now, avail } = useShared();
  const { toast } = useApp();
  const [unitFilter, setUnitFilter] = useState('active');

  if (mode === 'loading' || !state) {
    return <div className="page"><PageHead crumbs={[{ label: 'Overview', to: '/' }, { label: 'Meesho Quick' }]} title="Meesho Quick · retained stock and orders"><ModeBadge /></PageHead><Card><div className="sub">Loading the shared store…</div></Card></div>;
  }

  const by = (st) => state.units.filter((u) => u.status === st);
  const live = by('live'), qc = by('qc'), reserved = by('reserved'), sold = by('sold'), rto = by('rto');
  const orders = state.orders.filter((o) => o.mode === 'quick');
  const open = orders.filter((o) => ['placed', 'packed', 'dispatched'].includes(o.status));
  const units = state.units.filter((u) => (unitFilter === 'active' ? ['qc', 'live', 'reserved'].includes(u.status) : true)).sort((a, b) => a.holdUntil - b.holdUntil);
  const resetAll = async () => {
    if (!window.confirm('Reset Meesho Quick stock and orders for everyone using this demo?')) return;
    try { await run({ type: 'reset' }); toast('Meesho Quick demo data reset'); } catch (e) { toast(e.message); }
  };

  return (
    <div className="page">
      <PageHead crumbs={[{ label: 'Overview', to: '/' }, { label: 'Meesho Quick' }]} title="Meesho Quick · retained stock and orders"
        sub={`Retained units pass QC here, then go live in the Meesho Quick app for buyers within ${RADIUS_KM} km. Orders reserve the exact unit, so it cannot be sold twice.`}>
        <ModeBadge />
        <a className="btn btn-ghost" href="/quick/near-you" target="_blank" rel="noreferrer">Open customer app ↗</a>
        <button className="btn btn-ghost" onClick={resetAll}>Reset Quick data</button>
      </PageHead>

      <section className="kpi-grid" aria-label="Quick stock">
        <Tile label="Live on Quick" value={live.length} sub="units buyers can order now" tint="var(--green-t)" deep="#026a4b" visual={<Ring value={live.length / Math.max(1, live.length + reserved.length + qc.length)} color="var(--green)" />} />
        <Tile label="Awaiting QC" value={qc.length} sub="retained, not yet listed" tint="var(--amber-t)" deep="#7a5200" visual={<Ring value={qc.length ? 1 : 0} color="#D99A1B" />} />
        <Tile label="Reserved by orders" value={reserved.length} sub={`${open.length} open Quick order${open.length === 1 ? '' : 's'}`} tint="var(--blue-t)" deep="#2648a6" visual={<Ring value={reserved.length / Math.max(1, live.length + reserved.length)} color="var(--blue)" />} />
        <Tile label="Sold via Quick" value={sold.length} sub={`₹${(sold.length * 120).toLocaleString('en-IN')} reverse leg avoided`} tint="var(--violet-t)" deep="#3d2591" visual={<Ring value={sold.length / Math.max(1, sold.length + rto.length)} color="var(--violet)" />} />
        <Tile label="Back to seller" value={rto.length} sub="failed QC or hit the 21-day limit" tint="var(--orange-t)" deep="#7a3410" visual={<Ring value={rto.length / Math.max(1, state.units.length)} color="var(--orange)" />} />
      </section>

      <div className="two" style={{ alignItems: 'start' }}>
        <Card title="1 · Retain for Meesho Quick" sub="The Valmo-SAVE engine decides which failed deliveries are worth holding; the stock cap stops over-holding.">
          <div className="table-wrap">
            <table className="data" style={{ minWidth: 640 }}>
              <thead><tr><th>Product</th><th>Engine</th><th className="num">Held / cap</th><th className="num">Live</th><th>Variant</th><th>Action</th></tr></thead>
              <tbody>{PRODUCTS.map((p) => <RetainRow key={p.id} p={p} />)}</tbody>
            </table>
          </div>
        </Card>

        <Card title="2 · Quality check" sub="A unit goes live in the app only after all three checks pass." right={<Pill bg="var(--amber-t)" fg="#7a5200">{qc.length} waiting</Pill>}>
          {qc.length ? qc.map((u) => <QcRow key={u.id} u={u} />) : <div className="empty" style={{ padding: 18, textAlign: 'center' }}>No units waiting. Retain a unit on the left to start.</div>}
        </Card>
      </div>

      <Card title="3 · Quick orders to fulfil" sub="Placed in the customer app. Pick the reserved unit from its rack, pack, and hand it to the next LMSC shuttle." right={<Pill bg="var(--rose-t)" fg="#8e1d43">{open.length} open</Pill>}>
        <div className="table-wrap">
          <table className="data" style={{ minWidth: 900 }}>
            <thead><tr><th>Order</th><th>Items</th><th>Reserved unit · rack</th><th>Deliver to</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {orders.length === 0 && <tr><td colSpan="7" className="empty">No Quick orders yet. Place one from the customer app.</td></tr>}
              {orders.map((o) => <OrderRow key={o.id} o={o} />)}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="two" style={{ alignItems: 'start' }}>
        <Card title="Hold shelf · Quick units" sub="Sorted by hold deadline. Units still unsold at the deadline go back to the seller." right={
          <div className="tabs" role="tablist">
            {[['active', 'Active'], ['all', 'All']].map(([k, l]) => <button key={k} role="tab" aria-selected={unitFilter === k} className={unitFilter === k ? 'on' : ''} onClick={() => setUnitFilter(k)}>{l}</button>)}
          </div>}>
          <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="data">
              <thead><tr><th>Unit</th><th>Product</th><th>Rack</th><th>Status</th><th className="num">Days left</th></tr></thead>
              <tbody>
                {units.map((u) => {
                  const s = ST[u.status];
                  const left = Math.max(0, Math.ceil((u.holdUntil - now) / DAY));
                  return (
                    <tr key={u.id}>
                      <td><b>{u.id}</b>{u.orderId && <div className="muted" style={{ fontSize: 11 }}>{u.orderId}</div>}</td>
                      <td>{productById(u.skuId).short} <span className="muted">({u.variant})</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{u.rack}</td>
                      <td><Pill bg={s[1]} fg={s[2]}>{s[0]}</Pill></td>
                      <td className="num" style={{ color: ['live', 'qc'].includes(u.status) && left <= 3 ? 'var(--rose)' : undefined, fontWeight: 600 }}>{['live', 'qc', 'reserved'].includes(u.status) ? left : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Activity" sub="Every retain, listing, order and status change, newest first">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
            {state.log.length === 0 && <div className="empty" style={{ padding: 18, textAlign: 'center' }}>Nothing yet today.</div>}
            {state.log.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.45 }}>
                <Pill bg={l.kind === 'Order' ? 'var(--blue-t)' : l.kind === 'Listed' ? 'var(--green-t)' : l.kind === 'RTO' ? 'var(--orange-t)' : 'var(--violet-t)'} fg="var(--ink)" style={{ flex: 'none', minWidth: 58, justifyContent: 'center' }}>{l.kind}</Pill>
                <span style={{ flex: 1 }}>{l.text}<span className="muted"> · {ago(l.t, now)}</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="sub">Products in the app with stock: {PRODUCTS.filter((p) => availableFor(avail, p.id) > 0).length} of {PRODUCTS.length}. <Link to="/rto">Back to RTO &amp; Retain</Link></div>
    </div>
  );
}

