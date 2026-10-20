import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { AREAS, inQuickZone } from '../shared/catalog';
import { useBack, useCartView, useQuick } from './QuickApp';
import ProductArt from './ProductArt';
import { Empty, Ic, TopBar, quickBy, regularBy, rupee } from './ui';

function Line({ l }) {
  const { setQty, remove, setMode } = useQuick();
  const max = l.mode === 'quick' ? Math.max(1, Math.min(5, l.left)) : 5;
  return (
    <div className="mq-line">
      <Link to={`/quick/p/${l.skuId}`} className="th"><ProductArt product={l.p} variant={l.variant} /></Link>
      <div className="info">
        <span className="nm">{l.p.title}</span>
        <span className="meta">{l.p.axis}: {l.variant}</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}><b>{rupee(l.p.price * l.qty)}</b><s className="mq-sub">{rupee(l.p.mrp * l.qty)}</s></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <div className="mq-qty" style={{ height: 32 }}>
            <button style={{ height: 32, width: 32 }} onClick={() => setQty(l.key, l.qty - 1)} disabled={l.qty <= 1} aria-label="Decrease quantity">−</button>
            <span>{l.qty}</span>
            <button style={{ height: 32, width: 32 }} onClick={() => setQty(l.key, l.qty + 1)} disabled={l.qty >= max} aria-label="Increase quantity">+</button>
          </div>
          <button className="mq-link" style={{ color: 'var(--ink2)', fontWeight: 500 }} onClick={() => remove(l.key)}>Remove</button>
        </div>
        {l.issue && (
          <div className="mq-note w" style={{ marginTop: 6, flexDirection: 'column', gap: 6 }} role="alert">
            <span><b>{l.issue.text}.</b> {l.issue.kind === 'few' ? 'Reduce the quantity to continue.' : 'Switch to standard delivery or remove it.'}</span>
            <span style={{ display: 'flex', gap: 12 }}>
              {l.issue.kind === 'few' && <button className="mq-link" onClick={() => setQty(l.key, l.left)}>Set quantity to {l.left}</button>}
              {l.issue.kind !== 'few' && <button className="mq-link" onClick={() => setMode(l.key, 'regular')}>Use standard delivery</button>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ v }) {
  return (
    <div className="mq-sum">
      <b style={{ fontSize: 15 }}>Price details ({v.count} item{v.count === 1 ? '' : 's'})</b>
      <div className="r"><span>Total product price</span><span>{rupee(v.mrp)}</span></div>
      <div className="r" style={{ color: 'var(--q)' }}><span>Total discount</span><span>− {rupee(v.mrp - v.total)}</span></div>
      <div className="r"><span>Delivery</span><span style={{ color: 'var(--q)', fontWeight: 600 }}>Free</span></div>
      <div className="r tot"><span>Order total</span><span>{rupee(v.total)}</span></div>
    </div>
  );
}

export function Cart() {
  const back = useBack('/quick');
  const navigate = useNavigate();
  const v = useCartView();
  const { mode, now } = useShared();
  const quick = v.lines.filter((l) => l.mode === 'quick');
  const reg = v.lines.filter((l) => l.mode === 'regular');

  if (!v.lines.length) return (
    <>
      <TopBar title="Cart" onBack={back} />
      <Empty icon="cart" title="Your cart is empty" text="Products near you arrive within 1 day with Meesho Quick." action={<div style={{ display: 'flex', gap: 10 }}><Link to="/quick/near-you" className="mq-btn pri sm"><Ic.boltF width={14} height={14} />Shop Quick</Link><Link to="/quick" className="mq-btn out sm">Browse all</Link></div>} />
    </>
  );

  return (
    <>
      <TopBar title={`Cart · ${v.count} item${v.count === 1 ? '' : 's'}`} onBack={back} />
      <div className="mq-steps"><b>Cart</b> › Address &amp; payment › Done</div>
      {quick.length > 0 && (
        <section>
          <div className="mq-note q" style={{ margin: '12px 16px 0' }}><Ic.boltF width={16} height={16} /><span><b>Meesho Quick · arrives by {quickBy(now)}</b><br />Held at a hub near you. Stock is reserved when you place the order.</span></div>
          {quick.map((l) => <Line key={l.key} l={l} />)}
        </section>
      )}
      {reg.length > 0 && (
        <section>
          <div className="mq-note i" style={{ margin: '12px 16px 0' }}><Ic.truck width={16} height={16} /><span><b>Standard delivery · {regularBy(now)}</b><br />Shipped by the seller.</span></div>
          {reg.map((l) => <Line key={l.key} l={l} />)}
        </section>
      )}
      <div className="mq-div" />
      <Summary v={v} />
      <div className="mq-cta">
        <div className="mq-ctot"><b>{rupee(v.total)}</b><span>{v.mrp - v.total > 0 ? `You save ${rupee(v.mrp - v.total)}` : ''}</span></div>
        <button className="mq-btn pri" onClick={() => navigate('/quick/checkout')} disabled={v.blocked}>{mode === 'loading' ? 'Checking stock…' : v.blocked ? 'Fix items above' : 'Continue'}</button>
      </div>
    </>
  );
}

const PHONE = /^[6-9]\d{9}$/;

export function Checkout() {
  const back = useBack('/quick/cart');
  const navigate = useNavigate();
  const v = useCartView();
  const { run, mode, now } = useShared();
  const { customer, area, setArea, setAddress, clearCart } = useQuick();
  const [f, setF] = useState(() => ({ name: '', phone: '', line: '', ...(customer.address || {}) }));
  const [touched, setTouched] = useState(false);
  const [pay, setPay] = useState('prepaid');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!v.lines.length) return (<><TopBar title="Checkout" onBack={back} /><Empty icon="cart" title="Nothing to check out" text="Your cart is empty." action={<Link to="/quick" className="mq-btn pri sm">Continue shopping</Link>} /></>);

  const errs = {
    name: f.name.trim().length < 2 ? 'Enter the receiver’s name' : '',
    phone: !PHONE.test(f.phone) ? 'Enter a 10-digit mobile number' : '',
    line: f.line.trim().length < 5 ? 'Enter house number and street' : '',
  };
  const valid = !errs.name && !errs.phone && !errs.line;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === 'phone' ? e.target.value.replace(/\D/g, '').slice(0, 10) : e.target.value }));

  const place = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await run({
        type: 'placeOrder', customerId: customer.id, payment: pay,
        items: v.lines.map((l) => ({ skuId: l.skuId, variant: l.variant, qty: l.qty, mode: l.mode })),
        address: { name: f.name, phone: f.phone, line: f.line, area: area.name, city: area.city, pin: area.pin, km: area.km },
      });
      setAddress({ name: f.name, phone: f.phone, line: f.line });
      clearCart(v.lines.map((l) => l.key));
      const [a, b] = res.orderIds;
      navigate(`/quick/order/${a}?new=1${b ? '&also=' + b : ''}`, { replace: true });
    } catch (e) {
      setErr({ code: e.code, text: e.message });
      setSheet(false);
      setBusy(false);
    }
  };
  const submit = () => {
    setTouched(true);
    if (!valid || v.blocked) return;
    if (pay === 'prepaid') setSheet(true);
    else place();
  };

  const hasQuick = v.lines.some((l) => l.mode === 'quick');
  return (
    <>
      <TopBar title="Address & payment" onBack={back} />
      <div className="mq-steps">Cart › <b>Address &amp; payment</b> › Done</div>

      <section className="mq-sec">
        <div className="mq-note i" style={{ marginBottom: 14 }}><Ic.info width={16} height={16} /><span>Demo checkout: please use made-up details. Nothing is sent to a real courier.</span></div>
        <div className="mq-h"><h2 style={{ fontSize: 15 }}>Delivery address</h2></div>
        <div className={'mq-field' + (touched && errs.name ? ' bad' : '')}>
          <label htmlFor="n">Full name</label>
          <input id="n" autoComplete="off" value={f.name} onChange={set('name')} placeholder="e.g. Priya Sharma" />
          {touched && errs.name && <span className="er">{errs.name}</span>}
        </div>
        <div className={'mq-field' + (touched && errs.phone ? ' bad' : '')}>
          <label htmlFor="ph">Mobile number</label>
          <input id="ph" inputMode="numeric" autoComplete="off" value={f.phone} onChange={set('phone')} placeholder="10-digit number" />
          {touched && errs.phone && <span className="er">{errs.phone}</span>}
        </div>
        <div className={'mq-field' + (touched && errs.line ? ' bad' : '')}>
          <label htmlFor="ln">House no., building, street</label>
          <input id="ln" autoComplete="off" value={f.line} onChange={set('line')} placeholder="e.g. B-42, 2nd floor, Lane 3" />
          {touched && errs.line && <span className="er">{errs.line}</span>}
        </div>
        <div className="mq-field">
          <label htmlFor="ar">Area and pincode</label>
          <select id="ar" value={area.id} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.city} {a.pin}{inQuickZone(a) ? '' : ' (no Quick)'}</option>)}
          </select>
        </div>
      </section>
      <div className="mq-div" />

      <section className="mq-sec">
        <div className="mq-h"><h2 style={{ fontSize: 15 }}>Payment method</h2></div>
        <button className={'mq-pay' + (pay === 'prepaid' ? ' on' : '')} onClick={() => setPay('prepaid')} aria-pressed={pay === 'prepaid'}>
          <span className="rd" />
          <span style={{ flex: 1 }}><b>Pay online <span className="mq-badge" style={{ background: '#fef3dc', color: '#7a5200', marginLeft: 4 }}>SIMULATED</span></b>
            <span>UPI / card screen is simulated. No payment details are asked for or stored.</span>
            {hasQuick && <span style={{ display: 'block', color: 'var(--q)', fontWeight: 600, marginTop: 4 }}>Recommended for Quick: confirms instantly</span>}</span>
          <Ic.wallet width={22} height={22} style={{ color: 'var(--plum)' }} />
        </button>
        <button className={'mq-pay' + (pay === 'cod' ? ' on' : '')} onClick={() => setPay('cod')} aria-pressed={pay === 'cod'}>
          <span className="rd" />
          <span style={{ flex: 1 }}><b>Cash on delivery</b><span>Pay {rupee(v.total)} when the order arrives</span></span>
          <Ic.cash width={22} height={22} style={{ color: 'var(--plum)' }} />
        </button>
      </section>
      <div className="mq-div" />

      <section className="mq-sec" style={{ paddingBottom: 0 }}>
        <div className="mq-h"><h2 style={{ fontSize: 15 }}>Order summary</h2></div>
        {v.lines.map((l) => (
          <div key={l.key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flex: 'none' }}><ProductArt product={l.p} variant={l.variant} /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.p.short} · {l.variant} × {l.qty}</span>
              {l.mode === 'quick' ? <span className="mq-chip-q" style={{ marginTop: 3 }}><Ic.boltF width={10} height={10} />By {quickBy(now)}</span> : <span className="mq-sub">By {regularBy(now)}</span>}
            </span>
            <b style={{ fontSize: 13.5 }}>{rupee(l.p.price * l.qty)}</b>
          </div>
        ))}
      </section>
      <Summary v={v} />

      {v.blocked && mode !== 'loading' && !err && <div className="mq-note w" style={{ margin: '0 16px 16px' }} role="alert"><Ic.info width={16} height={16} /><span>Some items changed since you added them. <Link to="/quick/cart" className="mq-link">Review cart</Link></span></div>}
      {err && (
        <div className="mq-note e" style={{ margin: '0 16px 16px' }} role="alert">
          <Ic.info width={16} height={16} />
          <span><b>{err.code === 'OUT_OF_STOCK' ? 'Someone nearby just bought the last unit.' : err.text}</b>
            {err.code === 'OUT_OF_STOCK' && <> No order was placed{pay === 'prepaid' ? ' and no (simulated) payment was taken' : ''}. <Link to="/quick/cart" className="mq-link">Review cart</Link></>}
            {err.code === 'NETWORK' && <> <button className="mq-link" onClick={submit}>Try again</button></>}
          </span>
        </div>
      )}

      <div className="mq-cta">
        <div className="mq-ctot"><b>{rupee(v.total)}</b><span>{pay === 'cod' ? 'Cash on delivery' : 'Pay online (simulated)'}</span></div>
        <button className="mq-btn pri" onClick={submit} disabled={busy || v.blocked}>{busy ? 'Placing order…' : 'Place order'}</button>
      </div>

      {sheet && <PaySheet amount={v.total} onClose={() => !busy && setSheet(false)} onSuccess={place} busy={busy} />}
    </>
  );
}

function PaySheet({ amount, onClose, onSuccess, busy }) {
  const [phase, setPhase] = useState('choose'); // choose | processing | failed
  const simulate = (ok) => {
    setPhase('processing');
    setTimeout(() => (ok ? onSuccess() : setPhase('failed')), 1100);
  };
  return (
    <>
      <div className="mq-scrim" onClick={phase === 'processing' ? undefined : onClose} />
      <div className="mq-sheet" role="dialog" aria-modal="true" aria-label="Simulated payment">
        <div className="grab" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h3 style={{ flex: 1 }}>Pay {rupee(amount)}</h3>
          <span className="mq-badge" style={{ background: '#fef3dc', color: '#7a5200' }}>SIMULATED PAYMENT</span>
        </div>
        <p className="mq-sub" style={{ margin: '0 0 14px', lineHeight: 1.5 }}>This is a demo. No money moves, and no card, UPI or bank details are collected. Choose how the payment should turn out.</p>
        {phase === 'processing' || busy ? (
          <div style={{ textAlign: 'center', padding: '22px 0' }} aria-live="polite">
            <div className="mq-skel" style={{ width: 48, height: 48, borderRadius: 24, margin: '0 auto 12px' }} />
            <b>{busy ? 'Reserving your items…' : 'Processing simulated payment…'}</b>
          </div>
        ) : (
          <>
            {phase === 'failed' && <div className="mq-note e" style={{ marginBottom: 12 }} role="alert"><Ic.info width={16} height={16} /><span><b>Payment failed (simulated).</b> Nothing was charged and no order was placed. Try again or switch to cash on delivery.</span></div>}
            <button className="mq-btn pri" style={{ width: '100%', marginBottom: 10 }} onClick={() => simulate(true)}><Ic.check width={18} height={18} />Simulate successful payment</button>
            <button className="mq-btn out" style={{ width: '100%', marginBottom: 10 }} onClick={() => simulate(false)}>Simulate failed payment</button>
            <button className="mq-btn" style={{ width: '100%', color: 'var(--ink2)' }} onClick={onClose}>Cancel</button>
          </>
        )}
      </div>
    </>
  );
}

