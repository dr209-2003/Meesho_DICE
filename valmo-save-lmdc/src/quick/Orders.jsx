import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { RADIUS_KM, productById } from '../shared/catalog';
import { useBack, useCartView, useQuick } from './QuickApp';
import ProductArt from './ProductArt';
import { CartButton, Empty, Ic, StatusPill, TopBar, fmtDay, fmtTime, rupee } from './ui';

const STEPS = [
  ['placed', 'Order placed', (o) => (o.mode === 'quick' ? 'Item reserved at the Okhla hub' : 'Sent to the seller')],
  ['packed', 'Packed', (o) => (o.mode === 'quick' ? 'Picked from the hold shelf and packed' : 'Packed by the seller')],
  ['dispatched', 'Out for delivery', (o) => (o.mode === 'quick' ? `On its way to ${o.address.area}` : 'In transit')],
  ['delivered', 'Delivered', (o) => `Delivered to ${o.address.name}`],
];

function useMyOrders() {
  const { state } = useShared();
  const { customer } = useQuick();
  return (state?.orders || []).filter((o) => o.customerId === customer.id).sort((a, b) => b.createdAt - a.createdAt);
}

export function Orders() {
  const { count } = useCartView();
  const { mode } = useShared();
  const orders = useMyOrders();
  return (
    <>
      <TopBar title="My orders" right={<CartButton count={count} />} />
      {mode === 'loading' ? (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }} aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="mq-skel" style={{ height: 72 }} />)}</div>
      ) : !orders.length ? (
        <Empty icon="box" title="No orders yet" text="Orders you place appear here with live delivery status." action={<Link to="/quick/near-you" className="mq-btn pri sm"><Ic.boltF width={14} height={14} />Shop near you</Link>} />
      ) : (
        <>
          {mode === 'local' && <div className="mq-note i" style={{ margin: '12px 16px 4px' }}><Ic.info width={16} height={16} />Orders are saved in this browser (demo mode).</div>}
          {orders.map((o) => {
            const first = o.items[0];
            const p = productById(first.skuId);
            const n = o.items.reduce((s, l) => s + l.qty, 0);
            return (
              <Link key={o.id} to={`/quick/order/${o.id}`} className="mq-ord">
                <span className="th"><ProductArt product={p} variant={first.variant} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}><StatusPill s={o.status} />{o.mode === 'quick' && <span className="mq-chip-q" style={{ padding: '2px 6px' }}><Ic.boltF width={10} height={10} />Quick</span>}</span>
                  <b style={{ fontSize: 13.5, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.short}{n > 1 ? ` + ${n - 1} more` : ''}</b>
                  <span className="mq-sub">{o.id} · {fmtDay(o.createdAt)} · {rupee(o.total)}</span>
                </span>
                <Ic.chev width={18} height={18} style={{ color: 'var(--mut)' }} />
              </Link>
            );
          })}
        </>
      )}
    </>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const back = useBack('/quick/orders');
  const { state, mode, run } = useShared();
  const { customer, toast } = useQuick();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const o = state?.orders.find((x) => x.id === id && x.customerId === customer.id);
  const fresh = params.get('new') === '1';
  const also = params.get('also');

  if (mode === 'loading') return (<><TopBar title="Order" onBack={back} /><div style={{ padding: 16 }}><div className="mq-skel" style={{ height: 220 }} /></div></>);
  if (!o) return (<><TopBar title="Order" onBack={back} /><Empty icon="box" title="Order not found" text="Orders are visible on the device that placed them." action={<Link to="/quick/orders" className="mq-btn pri sm">My orders</Link>} /></>);

  const cancel = async () => {
    setBusy(true); setErr('');
    try {
      await run({ type: 'cancelOrder', orderId: o.id, customerId: customer.id });
      setConfirm(false);
      toast(o.mode === 'quick' ? 'Order cancelled · item released back to nearby stock' : 'Order cancelled');
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const idx = STEPS.findIndex(([k]) => k === o.status);
  const quick = o.mode === 'quick';

  return (
    <>
      <TopBar title={fresh ? 'Order confirmed' : `Order ${o.id}`} onBack={back} right={<Link to="/quick" className="mq-ib" aria-label="Home"><Ic.home /></Link>} />
      {fresh && (
        <div className="mq-ok">
          <div className="tick"><Ic.check width={38} height={38} strokeWidth={2.6} /></div>
          <h2>Order placed!</h2>
          <p>{quick ? `Arriving by ${fmtDay(o.eta)} with Meesho Quick` : `Arriving ${fmtDay(o.eta)}`}</p>
          <p style={{ marginTop: 6, fontWeight: 600, color: 'var(--ink)' }}>Order ID {o.id}</p>
          {also && <p style={{ marginTop: 8 }}>Standard-delivery items are in a separate order: <Link to={`/quick/order/${also}`} className="mq-link">{also}</Link></p>}
        </div>
      )}

      <section className="mq-sec">
        <div className="mq-h">
          <h2 style={{ fontSize: 15 }}>{quick ? <><Ic.boltF width={14} height={14} style={{ color: '#f5a623', verticalAlign: '-1px' }} /> Meesho Quick delivery</> : 'Standard delivery'}</h2>
          <StatusPill s={o.status} />
        </div>
        {o.status !== 'cancelled' && o.status !== 'delivered' && (
          <div className="mq-note q" style={{ marginBottom: 14 }}><Ic.truck width={16} height={16} /><span>Expected by <b>{fmtDay(o.eta)}</b>{quick ? ` · from the Okhla hub, ${o.address.km} km away` : ''}</span></div>
        )}
        <ol className="mq-tl" aria-label="Order progress">
          {o.status === 'cancelled' ? (
            <>
              <li className="done"><span className="dot"><Ic.check width={14} height={14} /></span><div><b>Order placed</b><span>{fmtDay(o.timeline.placed)}, {fmtTime(o.timeline.placed)}</span></div></li>
              <li className="cx"><span className="dot"><Ic.x width={14} height={14} /></span><div><b>Cancelled</b><span>{fmtDay(o.timeline.cancelled)}, {fmtTime(o.timeline.cancelled)}{quick ? ' · item returned to nearby stock' : ''}</span></div></li>
            </>
          ) : STEPS.map(([k, label, note], i) => {
            const t = o.timeline[k];
            return (
              <li key={k} className={i <= idx ? 'done' : i === idx + 1 ? 'cur' : ''}>
                <span className="dot">{i <= idx && <Ic.check width={14} height={14} />}</span>
                <div><b style={{ color: i <= idx ? undefined : 'var(--mut)' }}>{label}</b><span>{t ? `${fmtDay(t)}, ${fmtTime(t)} · ${note(o)}` : i === idx + 1 ? 'Up next' : ''}</span></div>
              </li>
            );
          })}
        </ol>
        <div className="mq-sub" style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Ic.info width={14} height={14} style={{ flex: 'none', marginTop: 2 }} />
          {mode === 'shared' ? 'Status updates come live from the LMDC dashboard as the hub team packs and dispatches.' : 'Demo mode: status updates come from the LMDC dashboard open in this same browser.'}
        </div>
      </section>
      <div className="mq-div" />

      <section className="mq-sec">
        <div className="mq-h"><h2 style={{ fontSize: 15 }}>Items</h2></div>
        {o.items.map((l) => {
          const p = productById(l.skuId);
          return (
            <Link key={l.skuId + l.variant} to={`/quick/p/${l.skuId}`} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0' }}>
              <span style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flex: 'none' }}><ProductArt product={p} variant={l.variant} /></span>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13.5 }}>{p.short}</span><span className="mq-sub">{p.axis}: {l.variant} · Qty {l.qty}</span></span>
              <b>{rupee(l.price * l.qty)}</b>
            </Link>
          );
        })}
        <dl className="mq-kv" style={{ marginTop: 12, borderTop: '1px dashed #d6d6e2', paddingTop: 12 }}>
          <dt>Total</dt><dd><b>{rupee(o.total)}</b></dd>
          <dt>Payment</dt><dd>{o.payment.status}</dd>
          <dt>Deliver to</dt><dd>{o.address.name}, {o.address.line}, {o.address.area}, {o.address.city} {o.address.pin}</dd>
          <dt>Placed</dt><dd>{fmtDay(o.createdAt)}, {fmtTime(o.createdAt)}</dd>
        </dl>
      </section>

      <section className="mq-sec" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 24 }}>
        {err && <div className="mq-note e" role="alert"><Ic.info width={16} height={16} />{err}</div>}
        {['placed', 'packed'].includes(o.status) && <button className="mq-btn out" onClick={() => setConfirm(true)}>Cancel order</button>}
        <Link to="/quick/orders" className="mq-btn out">All orders</Link>
        <Link to="/quick" className="mq-btn pri">Continue shopping</Link>
      </section>

      {confirm && (
        <>
          <div className="mq-scrim" onClick={() => !busy && setConfirm(false)} />
          <div className="mq-sheet" role="dialog" aria-modal="true" aria-label="Cancel order">
            <div className="grab" />
            <h3>Cancel {o.id}?</h3>
            <p className="mq-sub" style={{ margin: '4px 0 16px', lineHeight: 1.5 }}>{quick ? `The reserved item goes back on sale for other buyers within ${RADIUS_KM} km.` : 'The seller will be told not to ship it.'}{o.payment.method === 'prepaid' ? ' Your simulated payment would be refunded.' : ''}</p>
            <button className="mq-btn pri" style={{ width: '100%', marginBottom: 10, background: 'var(--err)' }} onClick={cancel} disabled={busy}>{busy ? 'Cancelling…' : 'Yes, cancel order'}</button>
            <button className="mq-btn out" style={{ width: '100%' }} onClick={() => setConfirm(false)} disabled={busy}>Keep order</button>
          </div>
        </>
      )}
    </>
  );
}

export function Account() {
  const { customer, area, clearCart, toast } = useQuick();
  const { mode, sync, state } = useShared();
  const { count } = useCartView();
  const orders = useMyOrders();
  return (
    <>
      <TopBar title="Account" right={<CartButton count={count} />} />
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16 }}>
        <span style={{ width: 56, height: 56, borderRadius: 28, background: 'linear-gradient(135deg,#f43397,#9f2089)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 20 }}>{(customer.address?.name || 'Demo')[0].toUpperCase()}</span>
        <span><b style={{ fontSize: 16, display: 'block' }}>{customer.address?.name || 'Demo customer'}</b><span className="mq-sub">Customer ID {customer.id}</span></span>
      </div>
      <div className="mq-card-box" style={{ margin: '0 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span className={'mq-live' + (mode === 'local' ? ' local' : '')}><i /></span>
          <b style={{ fontSize: 13.5 }}>{mode === 'shared' ? (sync.error ? 'Shared store · reconnecting' : 'Live shared stock') : mode === 'local' ? 'Demo mode · this browser only' : 'Connecting…'}</b>
        </div>
        <span className="mq-sub" style={{ lineHeight: 1.5, display: 'block' }}>
          {mode === 'shared'
            ? `Stock and orders come from the same store as the LMDC dashboard, on every device.${sync.at ? ` Last synced ${fmtTime(sync.at)}.` : ''}`
            : 'The shared server isn’t configured on this deployment, so stock and orders are kept in this browser and shared only with the LMDC dashboard open in another tab here.'}
        </span>
      </div>
      <div className="mq-acc">
        <Link to="/quick/orders" className="r"><Ic.box width={20} height={20} /><span>My orders</span><small>{orders.length}</small><Ic.chev width={16} height={16} /></Link>
        <Link to="/quick/cart" className="r"><Ic.cart width={20} height={20} /><span>Cart</span><small>{count}</small><Ic.chev width={16} height={16} /></Link>
        <Link to="/quick/near-you" className="r"><Ic.pin width={20} height={20} /><span>Delivery location</span><small>{area.name}</small><Ic.chev width={16} height={16} /></Link>
        <a href="/quick-ops" className="r"><Ic.store width={20} height={20} /><span>LMDC dashboard (hub view)</span><small>{state ? state.units.filter((u) => u.status === 'live').length + ' live' : ''}</small><Ic.chev width={16} height={16} /></a>
        <button className="r" onClick={() => { clearCart(); toast('Cart cleared'); }} disabled={!count}><Ic.x width={20} height={20} /><span>Clear cart</span><Ic.chev width={16} height={16} /></button>
      </div>
      <div className="mq-sec">
        <div className="mq-note i"><Ic.info width={16} height={16} /><span><b>About this prototype.</b> Meesho Quick sells products that failed delivery, were retained at a Valmo hub under Valmo-SAVE, and passed QC. Payments are simulated. Team 52 Saints, IIT Kharagpur.</span></div>
      </div>
    </>
  );
}
