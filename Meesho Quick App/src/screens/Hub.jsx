// Hub view for the Valmo LMDC team: retain a failed delivery (engine-checked), pass QC so it goes live
// in Meesho Quick, then pack and dispatch the orders customers place. Same store as the app.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { PRODUCTS, QUICK_HUB, RADIUS_KM, productById } from '../shared/catalog';
import { availableFor, eligibility } from '../shared/ops';
import { useBack, useQuick } from './App';
import { Empty, Ic, StatusPill, TopBar, fmtTime, rupee } from './ui';

const NEXT = { placed: 'Mark packed', packed: 'Mark dispatched', dispatched: 'Mark delivered' };
const DAY = 86400000;

function RetainRow({ p }) {
  const { state, run, avail } = useShared();
  const { toast } = useQuick();
  const [v, setV] = useState(p.options[0]);
  const [busy, setBusy] = useState(false);
  const el = eligibility(state, p.id);
  return (
    <div className="hub-row">
      <span className="th"><img src={p.img} alt="" /></span>
      <span className="x">
        <b>{p.title}</b>
        <span className="mut">{el.ok ? `Engine: RETAIN · held ${el.held}/${el.cap} · ${availableFor(avail, p.id)} live` : el.reason}</span>
        <span style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <select className="sel" value={v} onChange={(e) => setV(e.target.value)} aria-label={`${p.axis} for ${p.title}`} disabled={!el.ok}>{p.options.map((o) => <option key={o}>{o}</option>)}</select>
          <button className="btn pri sm" disabled={!el.ok || busy} onClick={async () => { setBusy(true); try { const r = await run({ type: 'retain', skuId: p.id, variant: v }); toast(`${r.unitId} retained · waiting for QC`); } catch (e) { toast(e.message); } setBusy(false); }}>Retain 1 unit</button>
        </span>
      </span>
    </div>
  );
}

function QcCard({ u }) {
  const { run } = useShared();
  const { toast } = useQuick();
  const [c, setC] = useState({ packaging: false, label: false, matches: false });
  const [busy, setBusy] = useState(false);
  const p = productById(u.skuId);
  const all = c.packaging && c.label && c.matches;
  const submit = async (pass) => {
    setBusy(true);
    try { const r = await run({ type: 'qc', unitId: u.id, checks: pass ? { packaging: true, label: true, matches: true } : c }); toast(r.live ? `${u.id} is live on Meesho Quick within ${RADIUS_KM} km` : `${u.id} failed QC · back to the seller`); } catch (e) { toast(e.message); }
    setBusy(false);
  };
  return (
    <div className="hub-card">
      <b>{u.id} · {p.title} ({u.variant})</b>
      <span className="mut" style={{ fontSize: 12 }}>Rack {u.rack} · AWB {u.awb}</span>
      {[['packaging', 'Packaging and seal intact'], ['label', 'Old label removed, hub tag applied'], ['matches', 'Product matches the listing']].map(([k, l]) => (
        <label key={k}><input type="checkbox" checked={c[k]} onChange={(e) => setC((x) => ({ ...x, [k]: e.target.checked }))} />{l}</label>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn pri sm" disabled={!all || busy} onClick={() => submit(true)}>Pass QC · list on Quick</button>
        <button className="btn out sm" disabled={busy} onClick={() => submit(false)}>Fail QC</button>
      </div>
    </div>
  );
}

function OrderCard({ o }) {
  const { run, state } = useShared();
  const { toast } = useQuick();
  const [busy, setBusy] = useState(false);
  const units = o.items.flatMap((l) => (l.units || []).map((id) => state.units.find((u) => u.id === id))).filter(Boolean);
  return (
    <div className="hub-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b>{o.id}</b><StatusPill s={o.status} /></div>
      <span>{o.items.map((l) => `${l.qty}× ${productById(l.skuId).title} (${l.variant})`).join(', ')}</span>
      <span className="mut" style={{ fontSize: 12 }}>{o.address.area} {o.address.pin} · {o.address.km} km · {o.payment.method === 'prepaid' ? 'Prepaid (sim.)' : 'COD'} {rupee(o.total)} · {fmtTime(o.createdAt)}</span>
      <span className="mut" style={{ fontSize: 12 }}>Pick: {units.map((u) => `${u.id} from rack ${u.rack}`).join(', ')}</span>
      {NEXT[o.status] && <button className="btn out sm" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={async () => { setBusy(true); try { const r = await run({ type: 'advanceOrder', orderId: o.id }); toast(`${o.id} marked ${r.status}`); } catch (e) { toast(e.message); } setBusy(false); }}>{NEXT[o.status]}</button>}
    </div>
  );
}

export default function Hub() {
  const back = useBack('/account');
  const { state, mode, run, now } = useShared();
  const { toast } = useQuick();
  if (mode === 'loading' || !state) return (<><TopBar title="Valmo hub view" onBack={back} /><div style={{ padding: 14 }}><div className="sk" style={{ height: 200 }} /></div></>);
  const by = (s) => state.units.filter((u) => u.status === s);
  const qc = by('qc');
  const orders = state.orders.filter((o) => o.mode === 'quick');
  const open = orders.filter((o) => NEXT[o.status]);
  const done = orders.filter((o) => !NEXT[o.status]);
  const live = by('live').sort((a, b) => a.holdUntil - b.holdUntil);
  return (
    <>
      <TopBar title="Valmo hub view" onBack={back} right={<Link to="/quick" className="ib" aria-label="Open Meesho Quick"><Ic.boltF style={{ color: '#f7a600' }} /></Link>} />
      <div className="note i" style={{ margin: '12px 14px 0' }}><Ic.store width={16} height={16} /><span><b>{QUICK_HUB.name}.</b> For the LMDC team: retain failed deliveries, check them, and fulfil Meesho Quick orders. {mode === 'local' ? 'Demo mode: shared with the app in this browser.' : 'Live: shared with the app on every device.'}</span></div>
      <div className="hub-k">
        <div style={{ background: 'var(--green-t)' }}><b>{by('live').length}</b><span>Live on Quick</span></div>
        <div style={{ background: '#fff4dd' }}><b>{qc.length}</b><span>Waiting for QC</span></div>
        <div style={{ background: '#e9effd' }}><b>{by('reserved').length}</b><span>Reserved by orders</span></div>
        <div style={{ background: '#efe7fd' }}><b>{by('sold').length}</b><span>Sold · {rupee(by('sold').length * 120)} return cost avoided</span></div>
      </div>

      <div className="sec-h"><h2 style={{ fontSize: 15 }}>1 · Retain a failed delivery</h2></div>
      {PRODUCTS.map((p) => <RetainRow key={p.id} p={p} />)}

      <div className="sec-h"><h2 style={{ fontSize: 15 }}>2 · Quality check ({qc.length})</h2></div>
      {qc.length ? qc.map((u) => <QcCard key={u.id} u={u} />) : <p className="mut" style={{ padding: '0 14px', fontSize: 13 }}>Nothing waiting. Retain a unit above to start.</p>}

      <div className="sec-h"><h2 style={{ fontSize: 15 }}>3 · Quick orders to fulfil ({open.length})</h2></div>
      {open.length ? open.map((o) => <OrderCard key={o.id} o={o} />) : <Empty icon="box" title="No open orders" text="Place an order in the app and it shows up here instantly." action={<Link to="/quick" className="btn pri sm">Open Meesho Quick</Link>} />}
      {done.length > 0 && <><div className="sec-h"><h2 style={{ fontSize: 15 }}>Completed ({done.length})</h2></div>{done.slice(0, 6).map((o) => <OrderCard key={o.id} o={o} />)}</>}

      <div className="sec-h"><h2 style={{ fontSize: 15 }}>Hold shelf ({live.length} live)</h2></div>
      {live.map((u) => (
        <div key={u.id} className="hub-row">
          <span className="th"><img src={productById(u.skuId).img} alt="" /></span>
          <span className="x"><b>{u.id} · {productById(u.skuId).title}</b><span className="mut">{u.variant} · rack {u.rack} · {Math.max(0, Math.ceil((u.holdUntil - now) / DAY))} days left of 21</span></span>
        </div>
      ))}

      <div className="sec-h"><h2 style={{ fontSize: 15 }}>Activity</h2></div>
      <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
        {state.log.length === 0 && <span className="mut">Nothing yet.</span>}
        {state.log.slice(0, 12).map((l, i) => <span key={i}><b>{l.kind}</b> · {l.text} <span className="mut">{fmtTime(l.t)}</span></span>)}
      </div>
      <div style={{ padding: '4px 14px 20px' }}>
        <button className="btn out" style={{ width: '100%' }} onClick={async () => { if (!window.confirm('Reset all demo stock and orders?')) return; try { await run({ type: 'reset' }); toast('Demo data reset'); } catch (e) { toast(e.message); } }}>Reset demo data</button>
      </div>
    </>
  );
}
