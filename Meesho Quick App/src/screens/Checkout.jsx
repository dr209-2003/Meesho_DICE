import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { AREAS, inQuickZone } from '../shared/catalog';
import { useBack, useCartView, useQuick } from './App';
import { Empty, Ic, TopBar, quickBy, regularBy, rupee } from './ui';

function Line({ l }) {
  const { setQty, remove, setMode } = useQuick();
  const max = l.mode === 'quick' ? Math.max(1, Math.min(5, l.left)) : 5;
  return (
    <div className="cline">
      <Link to={`/p/${l.skuId}`} className="th"><img src={l.p.img} alt="" /></Link>
      <div className="info">
        <span className="nm">{l.p.title}</span>
        <span className="meta">{l.p.axis}: {l.variant}</span>
        <span className="price"><b style={{ fontSize: 15 }}>{rupee(l.p.price * l.qty)}</b><s>{rupee(l.p.mrp * l.qty)}</s></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
          <div className="qty" style={{ height: 32 }}>
            <button style={{ width: 32, height: 32 }} onClick={() => setQty(l.key, l.qty - 1)} disabled={l.qty <= 1} aria-label="Decrease quantity">−</button>
            <span>{l.qty}</span>
            <button style={{ width: 32, height: 32 }} onClick={() => setQty(l.key, l.qty + 1)} disabled={l.qty >= max} aria-label="Increase quantity">+</button>
          </div>
          <button style={{ fontSize: 13, color: 'var(--ink2)' }} onClick={() => remove(l.key)}>Remove</button>
        </div>
        {l.issue && (
          <div className="note w" style={{ marginTop: 6, flexDirection: 'column', gap: 6 }} role="alert">
            <span><b>{l.issue.text}.</b> {l.issue.kind === 'few' ? 'Reduce the quantity to continue.' : 'Switch to standard delivery or remove it.'}</span>
            {l.issue.kind === 'few'
              ? <button className="link" style={{ textAlign: 'left' }} onClick={() => setQty(l.key, l.left)}>Set quantity to {l.left}</button>
              : <button className="link" style={{ textAlign: 'left' }} onClick={() => setMode(l.key, 'regular')}>Use standard delivery (5–7 days)</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ v, off = 0 }) {
  return (
    <div className="sum">
      <b style={{ fontSize: 15 }}>Price details ({v.count} item{v.count === 1 ? '' : 's'})</b>
      <div className="r"><span>Total product price</span><span>{rupee(v.mrp)}</span></div>
      <div className="r" style={{ color: 'var(--green)' }}><span>Total discount</span><span>− {rupee(v.mrp - v.total)}</span></div>
      <div className="r"><span>Delivery</span><span style={{ color: 'var(--green)', fontWeight: 600 }}>Free</span></div>
      {off > 0 && <div className="r" style={{ color: 'var(--green)' }}><span>Pay online discount</span><span>− {rupee(off)}</span></div>}
      <div className="r tot"><span>Order total</span><span>{rupee(v.total - off)}</span></div>
    </div>
  );
}

export function Cart() {
  const back = useBack('/');
  const navigate = useNavigate();
  const v = useCartView();
  const { mode, now } = useShared();
  const quick = v.lines.filter((l) => l.mode === 'quick');
  const reg = v.lines.filter((l) => l.mode === 'regular');
  if (!v.lines.length) return (
    <><TopBar title="Cart" onBack={back} />
      <Empty icon="cart" title="Your cart is empty" text="Products near you arrive in 1–2 days with Meesho Quick." action={<div style={{ display: 'flex', gap: 10 }}><Link to="/quick" className="btn pri sm"><Ic.boltF width={14} height={14} />Shop Quick</Link><Link to="/" className="btn out sm">Browse all</Link></div>} /></>
  );
  return (
    <>
      <TopBar title={`Cart · ${v.count} item${v.count === 1 ? '' : 's'}`} onBack={back} />
      <div className="steps"><b>Cart</b> › Address &amp; payment › Done</div>
      {quick.length > 0 && (
        <section>
          <div className="note q" style={{ margin: '12px 14px 0' }}><Ic.boltF width={16} height={16} /><span><b>Meesho Quick · arrives by {quickBy(now)}</b><br />Held at a hub near you. The exact unit is reserved when you order.</span></div>
          {quick.map((l) => <Line key={l.key} l={l} />)}
        </section>
      )}
      {reg.length > 0 && (
        <section>
          <div className="note i" style={{ margin: '12px 14px 0' }}><Ic.truck width={16} height={16} /><span><b>Standard delivery · {regularBy(now)}</b><br />Shipped by the seller.</span></div>
          {reg.map((l) => <Line key={l.key} l={l} />)}
        </section>
      )}
      <div className="div" />
      <Summary v={v} />
      <div className="cta">
        <div className="ctot"><b>{rupee(v.total)}</b><span>{v.mrp > v.total ? `You save ${rupee(v.mrp - v.total)}` : ''}</span></div>
        <button className="btn pri" onClick={() => navigate('/checkout')} disabled={v.blocked}>{mode === 'loading' ? 'Checking stock…' : v.blocked ? 'Fix items above' : 'Continue'}</button>
      </div>
    </>
  );
}

const PHONE = /^[6-9]\d{9}$/;

export function Checkout() {
  const back = useBack('/cart');
  const navigate = useNavigate();
  const v = useCartView();
  const { run, mode, now } = useShared();
  const { customer, area, setArea, setAddress, clearCart, setPrepaid } = useQuick();
  const [f, setF] = useState(() => ({ name: '', phone: '', line: '', ...(customer.address || {}) }));
  const [touched, setTouched] = useState(false);
  const pay = customer.prepaid === false ? 'cod' : 'prepaid';
  const off = pay === 'prepaid' && v.total > 0 ? 20 : 0;
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!v.lines.length) return (<><TopBar title="Checkout" onBack={back} /><Empty icon="cart" title="Nothing to check out" text="Your cart is empty." action={<Link to="/" className="btn pri sm">Continue shopping</Link>} /></>);

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
      navigate(`/order/${a}?new=1${b ? '&also=' + b : ''}`, { replace: true });
    } catch (e) {
      setErr({ code: e.code, text: e.message }); setSheet(false); setBusy(false);
    }
  };
  const submit = () => {
    setTouched(true);
    if (!valid || v.blocked) return;
    if (pay === 'prepaid') setSheet(true); else place();
  };
  const hasQuick = v.lines.some((l) => l.mode === 'quick');

  return (
    <>
      <TopBar title="Address & payment" onBack={back} />
      <div className="steps">Cart › <b>Address &amp; payment</b> › Done</div>
      <section className="block">
        <div className="note i" style={{ marginBottom: 14 }}><Ic.info width={16} height={16} /><span>Demo checkout: please use made-up details. Nothing is sent to a real courier.</span></div>
        <h3>Delivery address</h3>
        <div className={'fld' + (touched && errs.name ? ' bad' : '')}><label htmlFor="n">Full name</label><input id="n" autoComplete="off" value={f.name} onChange={set('name')} placeholder="e.g. Priya Sharma" />{touched && errs.name && <span className="er">{errs.name}</span>}</div>
        <div className={'fld' + (touched && errs.phone ? ' bad' : '')}><label htmlFor="ph">Mobile number</label><input id="ph" inputMode="numeric" autoComplete="off" value={f.phone} onChange={set('phone')} placeholder="10-digit number" />{touched && errs.phone && <span className="er">{errs.phone}</span>}</div>
        <div className={'fld' + (touched && errs.line ? ' bad' : '')}><label htmlFor="ln">House no., building, street</label><input id="ln" autoComplete="off" value={f.line} onChange={set('line')} placeholder="e.g. B-42, 2nd floor, Lane 3" />{touched && errs.line && <span className="er">{errs.line}</span>}</div>
        <div className="fld"><label htmlFor="ar">Area and pincode</label>
          <select id="ar" value={area.id} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a.id} value={a.id}>{a.pin} · {a.name}, {a.city}{inQuickZone(a) ? '' : ' (no Quick)'}</option>)}</select>
        </div>
      </section>
      <div className="div" />
      <section className="block">
        <h3>Payment method</h3>
        <button className={'opt' + (pay === 'prepaid' ? ' on' : '')} onClick={() => setPrepaid(true)} aria-pressed={pay === 'prepaid'}>
          <span className="rd" />
          <span style={{ flex: 1 }}><b>Pay Now and get ₹20 off <span className="badge" style={{ background: 'var(--green-t)', color: 'var(--green)', marginLeft: 4 }}>RECOMMENDED</span></b>
            <span>Pay {rupee(v.total - 20)} by UPI / card (simulated, no payment details stored).</span>
            {hasQuick && <span style={{ display: 'block', color: 'var(--green)', fontWeight: 600, marginTop: 4 }}>Faster delivery from local inventory</span>}</span>
          <Ic.card width={22} height={22} style={{ color: 'var(--pink)' }} />
        </button>
        <button className={'opt' + (pay === 'cod' ? ' on' : '')} onClick={() => setPrepaid(false)} aria-pressed={pay === 'cod'}>
          <span className="rd" />
          <span style={{ flex: 1 }}><b>Cash on Delivery</b><span>Pay {rupee(v.total)} when the order arrives · no ₹20 discount</span></span>
          <Ic.cash width={22} height={22} style={{ color: 'var(--pink)' }} />
        </button>
      </section>
      <div className="div" />
      <section className="block" style={{ paddingBottom: 0 }}>
        <h3>Order summary</h3>
        {v.lines.map((l) => (
          <div key={l.key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <img src={l.p.img} alt="" style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover' }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.p.title} · {l.variant} × {l.qty}</span>
              {l.mode === 'quick' ? <span className="badge" style={{ background: 'var(--green-t)', color: 'var(--green)', marginTop: 3 }}>⚡ By {quickBy(now)}</span> : <span className="mut" style={{ fontSize: 12 }}>By {regularBy(now)}</span>}
            </span>
            <b style={{ fontSize: 13.5 }}>{rupee(l.p.price * l.qty)}</b>
          </div>
        ))}
      </section>
      <Summary v={v} off={off} />
      {v.blocked && mode !== 'loading' && !err && <div className="note w" style={{ margin: '0 14px 16px' }} role="alert"><Ic.info width={16} height={16} /><span>Some items changed since you added them. <Link to="/cart" className="link">Review cart</Link></span></div>}
      {err && (
        <div className="note e" style={{ margin: '0 14px 16px' }} role="alert"><Ic.info width={16} height={16} />
          <span><b>{err.code === 'OUT_OF_STOCK' ? 'Someone nearby just bought the last unit.' : err.text}</b>
            {err.code === 'OUT_OF_STOCK' && <> No order was placed{pay === 'prepaid' ? ' and no (simulated) payment was taken' : ''}. <Link to="/cart" className="link">Review cart</Link></>}
            {err.code === 'NETWORK' && <> <button className="link" onClick={submit}>Try again</button></>}
          </span>
        </div>
      )}
      <div className="cta">
        <div className="ctot"><b>{rupee(v.total - off)}</b><span style={{ color: 'var(--pink)' }}>{pay === 'cod' ? 'Cash on Delivery' : 'Pay Now · ₹20 off applied'}</span></div>
        <button className="btn pri" onClick={submit} disabled={busy || v.blocked}>{busy ? 'Placing order…' : 'Place Order'}</button>
      </div>
      {sheet && <PaySheet amount={v.total - off} onClose={() => !busy && setSheet(false)} onSuccess={place} busy={busy} />}
    </>
  );
}

function PaySheet({ amount, onClose, onSuccess, busy }) {
  const [phase, setPhase] = useState('choose');
  const simulate = (ok) => { setPhase('processing'); setTimeout(() => (ok ? onSuccess() : setPhase('failed')), 1100); };
  return (
    <>
      <div className="scrim" onClick={phase === 'processing' ? undefined : onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Simulated payment">
        <div className="grab" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><h3 style={{ flex: 1 }}>Pay {rupee(amount)}</h3><span className="badge" style={{ background: '#fff4dd', color: '#7a5200' }}>SIMULATED PAYMENT</span></div>
        <p className="mut" style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.5 }}>This is a demo. No money moves, and no card, UPI or bank details are collected. Choose how the payment should turn out.</p>
        {phase === 'processing' || busy ? (
          <div style={{ textAlign: 'center', padding: '22px 0' }} aria-live="polite"><div className="sk" style={{ width: 48, height: 48, borderRadius: 24, margin: '0 auto 12px' }} /><b>{busy ? 'Reserving your item at the hub…' : 'Processing simulated payment…'}</b></div>
        ) : (
          <>
            {phase === 'failed' && <div className="note e" style={{ marginBottom: 12 }} role="alert"><Ic.info width={16} height={16} /><span><b>Payment failed (simulated).</b> Nothing was charged and no order was placed. Try again or choose cash on delivery.</span></div>}
            <button className="btn pri" style={{ width: '100%', marginBottom: 10 }} onClick={() => simulate(true)}><Ic.check width={18} height={18} />Simulate successful payment</button>
            <button className="btn out" style={{ width: '100%', marginBottom: 10 }} onClick={() => simulate(false)}>Simulate failed payment</button>
            <button className="btn" style={{ width: '100%', color: 'var(--ink2)' }} onClick={onClose}>Cancel</button>
          </>
        )}
      </div>
    </>
  );
}
