import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { PRODUCTS, RADIUS_KM, productById } from '../shared/catalog';
import { useBack, useCartView, useQuick } from './App';
import { CartBtn, Empty, Ic, StatusPill, TopBar, fmtDay, fmtTime, rupee } from './ui';

const STEPS = [
  ['placed', 'Order placed', (o) => (o.mode === 'quick' ? 'Item reserved at the Valmo hub' : 'Sent to the seller')],
  ['packed', 'Packed', (o) => (o.mode === 'quick' ? 'Picked from the hub shelf and packed' : 'Packed by the seller')],
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
      <TopBar title="My Orders" right={<CartBtn count={count} />} />
      {mode === 'loading' ? (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }} aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="sk" style={{ height: 72 }} />)}</div>
      ) : !orders.length ? (
        <Empty icon="box" title="No orders yet" text="Orders you place appear here with live delivery status." action={<Link to="/quick" className="btn pri sm"><Ic.boltF width={14} height={14} />Shop near you</Link>} />
      ) : orders.map((o) => {
        const first = o.items[0];
        const p = productById(first.skuId);
        const n = o.items.reduce((s, l) => s + l.qty, 0);
        return (
          <Link key={o.id} to={`/order/${o.id}`} className="ord">
            <span className="th"><img src={p.img} alt="" /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}><StatusPill s={o.status} />{o.mode === 'quick' && <span className="badge" style={{ background: 'var(--pink-t)', color: 'var(--pink-d)' }}>⚡ Quick</span>}</span>
              <b style={{ fontSize: 13.5, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}{n > 1 ? ` + ${n - 1} more` : ''}</b>
              <span className="mut" style={{ fontSize: 12 }}>{o.id} · {fmtDay(o.createdAt)} · {rupee(o.total)}</span>
            </span>
            <Ic.chev width={18} height={18} style={{ color: 'var(--mut)' }} />
          </Link>
        );
      })}
    </>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const back = useBack('/orders');
  const { state, mode, run } = useShared();
  const { customer, toast } = useQuick();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const o = state?.orders.find((x) => x.id === id && x.customerId === customer.id);
  const fresh = params.get('new') === '1';
  const also = params.get('also');
  if (mode === 'loading') return (<><TopBar title="Order" onBack={back} /><div style={{ padding: 14 }}><div className="sk" style={{ height: 220 }} /></div></>);
  if (!o) return (<><TopBar title="Order" onBack={back} /><Empty icon="box" title="Order not found" text="Orders are visible on the device that placed them." action={<Link to="/orders" className="btn pri sm">My orders</Link>} /></>);
  const cancel = async () => {
    setBusy(true); setErr('');
    try { await run({ type: 'cancelOrder', orderId: o.id, customerId: customer.id }); setConfirm(false); toast(o.mode === 'quick' ? 'Order cancelled · item back on sale nearby' : 'Order cancelled'); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const idx = STEPS.findIndex(([k]) => k === o.status);
  const quick = o.mode === 'quick';
  return (
    <>
      <TopBar title={fresh ? 'Order confirmed' : `Order ${o.id}`} onBack={back} right={<Link to="/" className="ib" aria-label="Home"><Ic.home /></Link>} />
      {fresh && (
        <div className="ok">
          <div className="tick"><Ic.check width={38} height={38} strokeWidth={2.6} /></div>
          <h2>Order placed!</h2>
          <p>{quick ? `Arriving by ${fmtDay(o.eta)} with Meesho Quick` : `Arriving ${fmtDay(o.eta)}`}</p>
          <p style={{ marginTop: 6, fontWeight: 600, color: 'var(--ink)' }}>Order ID {o.id}</p>
          {quick && <p style={{ marginTop: 8, color: '#0a5d36' }}>This parcel skipped a return trip and found you instead.</p>}
          {also && <p style={{ marginTop: 8 }}>Standard-delivery items are in a separate order: <Link to={`/order/${also}`} className="link">{also}</Link></p>}
        </div>
      )}
      <section className="block">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{quick ? '⚡ Meesho Quick delivery' : 'Standard delivery'}</h3><StatusPill s={o.status} />
        </div>
        {!['cancelled', 'delivered'].includes(o.status) && <div className="note q" style={{ marginBottom: 14 }}><Ic.truck width={16} height={16} /><span>Expected by <b>{fmtDay(o.eta)}</b>{quick ? ` · from the Valmo hub, ${o.address.km} km away` : ''}</span></div>}
        <ol className="tl" aria-label="Order progress">
          {o.status === 'cancelled' ? (
            <>
              <li className="done"><span className="dot"><Ic.check width={14} height={14} /></span><div><b>Order placed</b><span>{fmtDay(o.timeline.placed)}, {fmtTime(o.timeline.placed)}</span></div></li>
              <li className="cx"><span className="dot"><Ic.x width={14} height={14} /></span><div><b>Cancelled</b><span>{fmtDay(o.timeline.cancelled)}, {fmtTime(o.timeline.cancelled)}{quick ? ' · item back on sale nearby' : ''}</span></div></li>
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
        <div className="mut" style={{ marginTop: 14, fontSize: 12, display: 'flex', gap: 6 }}>
          <Ic.info width={14} height={14} style={{ flex: 'none', marginTop: 2 }} />
          <span>Status updates come from the Valmo hub team{mode === 'local' ? ' (hub view in this browser)' : ''}. <Link to="/hub" className="link" style={{ fontSize: 12 }}>Open hub view</Link></span>
        </div>
      </section>
      <div className="div" />
      <section className="block">
        <h3>Items</h3>
        {o.items.map((l) => {
          const p = productById(l.skuId);
          return (
            <Link key={l.skuId + l.variant} to={`/p/${l.skuId}`} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '6px 0' }}>
              <img src={p.img} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover' }} />
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13.5 }}>{p.title}</span><span className="mut" style={{ fontSize: 12 }}>{p.axis}: {l.variant} · Qty {l.qty}</span></span>
              <b>{rupee(l.price * l.qty)}</b>
            </Link>
          );
        })}
        <dl className="kv" style={{ borderTop: '1px dashed #ddd5e1', paddingTop: 12 }}>
          <dt>Total</dt><dd><b>{rupee(o.total)}</b></dd><dt>Payment</dt><dd>{o.payment.status}</dd>
          <dt>Deliver to</dt><dd>{o.address.name}, {o.address.line}, {o.address.area}, {o.address.city} {o.address.pin}</dd>
        </dl>
      </section>
      <section className="block" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 24 }}>
        {err && <div className="note e" role="alert"><Ic.info width={16} height={16} />{err}</div>}
        {['placed', 'packed'].includes(o.status) && <button className="btn out" onClick={() => setConfirm(true)}>Cancel order</button>}
        <Link to="/orders" className="btn out">All orders</Link>
        <Link to="/" className="btn pri">Continue shopping</Link>
      </section>
      {confirm && (
        <>
          <div className="scrim" onClick={() => !busy && setConfirm(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Cancel order">
            <div className="grab" />
            <h3>Cancel {o.id}?</h3>
            <p className="mut" style={{ margin: '4px 0 16px', fontSize: 13, lineHeight: 1.5 }}>{quick ? `The reserved item goes back on sale for other buyers within ${RADIUS_KM} km.` : 'The seller will be told not to ship it.'}{o.payment.method === 'prepaid' ? ' Your simulated payment would be refunded.' : ''}</p>
            <button className="btn pri" style={{ width: '100%', marginBottom: 10, background: 'var(--err)' }} onClick={cancel} disabled={busy}>{busy ? 'Cancelling…' : 'Yes, cancel order'}</button>
            <button className="btn out" style={{ width: '100%' }} onClick={() => setConfirm(false)} disabled={busy}>Keep order</button>
          </div>
        </>
      )}
    </>
  );
}

export function Account() {
  const { customer, area, clearCart, toast, openLocation, toggleWish } = useQuick();
  const { mode, sync } = useShared();
  const { count } = useCartView();
  const orders = useMyOrders();
  const wish = (customer.wish || []).map(productById).filter(Boolean);
  return (
    <>
      <TopBar title="Account" right={<CartBtn count={count} />} />
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14 }}>
        <span style={{ width: 56, height: 56, borderRadius: 28, background: 'linear-gradient(135deg,#f43397,#9f2089)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 20 }}>{(customer.address?.name || 'D')[0].toUpperCase()}</span>
        <span><b style={{ fontSize: 16, display: 'block' }}>{customer.address?.name || 'Demo customer'}</b><span className="mut" style={{ fontSize: 12 }}>Customer ID {customer.id}</span></span>
      </div>
      <div className="box" style={{ margin: '0 14px 14px' }}>
        <b style={{ fontSize: 13.5, display: 'block', marginBottom: 4 }}>{mode === 'shared' ? (sync.error ? 'Shared store · reconnecting' : '● Live shared stock') : mode === 'local' ? '● Demo mode · this browser only' : 'Connecting…'}</b>
        <span className="mut" style={{ fontSize: 12, lineHeight: 1.5, display: 'block' }}>{mode === 'shared' ? `Stock and orders are shared with the Valmo hub view on every device.${sync.at ? ` Last synced ${fmtTime(sync.at)}.` : ''}` : 'The shared server isn’t set up on this deployment, so stock and orders stay in this browser. The hub view in another tab of this browser stays in sync.'}</span>
      </div>
      <div className="acc">
        <Link to="/orders" className="r"><Ic.box width={20} height={20} /><span>My orders</span><small>{orders.length}</small><Ic.chev width={16} height={16} /></Link>
        <Link to="/cart" className="r"><Ic.cart width={20} height={20} /><span>Cart</span><small>{count}</small><Ic.chev width={16} height={16} /></Link>
        <button className="r" onClick={openLocation}><Ic.pin width={20} height={20} /><span>Delivery location</span><small>{area.pin}</small><Ic.chev width={16} height={16} /></button>
        <Link to="/hub" className="r"><Ic.store width={20} height={20} /><span>Valmo hub view (for the LMDC team)</span><Ic.chev width={16} height={16} /></Link>
        <button className="r" onClick={() => { clearCart(); toast('Cart cleared'); }} disabled={!count}><Ic.x width={20} height={20} /><span>Clear cart</span><Ic.chev width={16} height={16} /></button>
      </div>
      <div id="wishlist" className="sec-h"><h2 style={{ fontSize: 15 }}>Wishlist ({wish.length})</h2></div>
      {wish.length ? (
        <div style={{ padding: '0 14px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {wish.map((p) => (
            <div key={p.id} className="box" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
              <Link to={`/p/${p.id}`}><img src={p.img} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover' }} /></Link>
              <Link to={`/p/${p.id}`} style={{ flex: 1, minWidth: 0, fontSize: 13 }}><b style={{ display: 'block', fontWeight: 600 }}>{p.title}</b>{rupee(p.price)}</Link>
              <button className="ib" onClick={() => toggleWish(p.id)} aria-label={`Remove ${p.title} from wishlist`}><Ic.x width={18} height={18} /></button>
            </div>
          ))}
        </div>
      ) : <p className="mut" style={{ padding: '0 14px', fontSize: 13 }}>Tap the heart on any product to save it here.</p>}
      <div style={{ padding: 14 }}>
        <div className="note i"><Ic.info width={16} height={16} /><span><b>About this prototype.</b> Meesho Quick sells products that could not be delivered, were held at a Valmo hub under Valmo-SAVE, and passed quality checks. {PRODUCTS.length} demo products · payments are simulated · Team 52 Saints, IIT Kharagpur.</span></div>
      </div>
    </>
  );
}
