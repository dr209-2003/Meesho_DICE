import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { inQuickZone, productById } from '../shared/catalog';
import { availableFor } from '../shared/ops';
import { useBack, useCartView, useQuick } from './QuickApp';
import ProductArt from './ProductArt';
import { CartButton, Empty, Ic, TopBar, quickBy, regularBy, rupee } from './ui';

export default function Product() {
  const { id } = useParams();
  const p = productById(id);
  const back = useBack('/quick');
  const navigate = useNavigate();
  const { avail, mode, now } = useShared();
  const { area, addToCart, customer, toast } = useQuick();
  const { count } = useCartView();
  const zone = inQuickZone(area);
  const [variant, setVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [slide, setSlide] = useState(0);
  const [err, setErr] = useState('');
  const track = useRef(null);

  // default to a variant that is in stock near the customer
  useEffect(() => {
    if (!p || variant || mode === 'loading') return;
    setVariant(p.options.find((o) => zone && availableFor(avail, p.id, o) > 0) || p.options[0]);
  }, [p, variant, avail, zone, mode]);

  if (!p) return (<><TopBar title="Product" onBack={back} /><Empty icon="search" title="Product not found" text="It may have been removed from the catalogue." action={<Link to="/quick" className="mq-btn pri sm">Go home</Link>} /></>);

  const v = variant || p.options[0];
  const left = availableFor(avail, p.id, v);
  const anyNear = availableFor(avail, p.id) > 0;
  const quick = zone && left > 0;
  const inCart = customer.cart.filter((l) => l.skuId === p.id && l.variant === v && l.mode === 'quick').reduce((n, l) => n + l.qty, 0);
  const maxQty = quick ? Math.max(0, Math.min(5, left - inCart)) : 5;
  const q = Math.min(qty, Math.max(1, maxQty));

  const go = (i) => { setSlide(i); track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' }); };
  const add = (buy) => {
    setErr('');
    if (mode === 'loading') return;
    if (quick && maxQty < 1) { setErr(`All ${left} unit${left > 1 ? 's' : ''} near you are already in your cart.`); return; }
    addToCart(p.id, v, q, quick ? 'quick' : 'regular');
    if (buy) navigate('/quick/checkout');
    else toast(quick ? 'Added · arrives within 1 day' : 'Added to cart', ['View cart', '/quick/cart']);
  };

  return (
    <>
      <TopBar title={p.short} onBack={back} right={<CartButton count={count} />} />
      <div className="mq-gal">
        <div className="track" ref={track} onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {[0, 1, 2].map((i) => <div key={i} className="slide"><ProductArt product={p} variant={v} view={i} label={`${p.short}, ${v}, image ${i + 1} of 3`} /></div>)}
        </div>
        {quick && <span className="mq-flag" style={{ top: 12, left: 12 }}><Ic.boltF width={11} height={11} />QUICK · 1 DAY</span>}
        <div className="mq-dots">{[0, 1, 2].map((i) => <button key={i} className={slide === i ? 'on' : ''} onClick={() => go(i)} aria-label={`Image ${i + 1}`} />)}</div>
      </div>
      <div className="mq-thumbs">
        {[0, 1, 2].map((i) => <button key={i} className={slide === i ? 'on' : ''} onClick={() => go(i)} aria-label={`Show image ${i + 1}`}><ProductArt product={p} variant={v} view={i} label="" /></button>)}
      </div>

      <section className="mq-sec">
        <h2 className="mq-pdp-t">{p.title}</h2>
        <div className="mq-price"><b>{rupee(p.price)}</b><s>{rupee(p.mrp)}</s><em>{p.off}% off</em></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={'mq-rate' + (p.rating < 4 ? ' lo' : '')}>{p.rating}<Ic.star width={9} height={9} /></span>
          <span className="mq-sub">{p.ratings.toLocaleString('en-IN')} ratings</span>
          {zone && anyNear && <span className="mq-chip-q"><Ic.boltF width={10} height={10} />Available near you</span>}
        </div>
      </section>
      <div className="mq-div" />

      <section className="mq-sec">
        <div className="mq-h"><h2 style={{ fontSize: 15 }}>Select {p.axis.toLowerCase()}: <span style={{ color: 'var(--plum)' }}>{v}</span></h2></div>
        <div className="mq-vars" role="radiogroup" aria-label={p.axis}>
          {p.options.map((o) => {
            const n = availableFor(avail, p.id, o);
            return (
              <button key={o} role="radio" aria-checked={o === v} className={'mq-var' + (o === v ? ' on' : '')} onClick={() => { setVariant(o); setQty(1); setErr(''); }}>
                {zone && n > 0 && <span className="z" aria-hidden="true" />}{o}
                {zone && n > 0 && <span className="sr-only">, available near you</span>}
              </button>
            );
          })}
        </div>
        {zone && anyNear && <div className="mq-sub" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--q)' }} />Green dot = in stock near you, delivered within 1 day</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>Quantity</span>
          <div className="mq-qty">
            <button onClick={() => setQty(Math.max(1, q - 1))} disabled={q <= 1} aria-label="Decrease quantity">−</button>
            <span aria-live="polite">{q}</span>
            <button onClick={() => setQty(Math.min(maxQty, q + 1))} disabled={q >= maxQty} aria-label="Increase quantity">+</button>
          </div>
          {quick && <span className="mq-sub" style={{ color: left <= 2 ? 'var(--err)' : undefined, fontWeight: left <= 2 ? 600 : 400 }}>{left <= 2 ? `Only ${left} left near you` : `${left} near you`}</span>}
        </div>
        {err && <div className="mq-note e" style={{ marginTop: 12 }} role="alert"><Ic.info width={16} height={16} />{err}</div>}
      </section>
      <div className="mq-div" />

      <section className="mq-sec">
        <div className="mq-h"><h2 style={{ fontSize: 15 }}>Delivery to {area.name} {area.pin}</h2></div>
        <div className="mq-dlv">
          {quick ? (
            <>
              <div className="r">
                <span className="ic" style={{ background: '#fff3c4', color: '#a06b00' }}><Ic.boltF width={20} height={20} /></span>
                <div><b>Get it by tomorrow, {quickBy(now).split(', ')[1]}</b><span>Meesho Quick · this exact item is held at the Okhla hub, {area.km} km from you</span></div>
              </div>
              <div className="r">
                <span className="ic" style={{ background: '#e3f6ee', color: 'var(--q)' }}><Ic.shield width={20} height={20} /></span>
                <div><b>Quality checked at the hub</b><span>Seal, label and product verified before listing. Same price as the regular listing.</span></div>
              </div>
            </>
          ) : (
            <>
              {zone && anyNear && (
                <div className="r" style={{ background: '#fafafc' }}>
                  <span className="ic" style={{ background: '#efeff5', color: 'var(--ink2)' }}><Ic.bolt width={20} height={20} /></span>
                  <div><b>{v} is sold out near you</b><span>Pick a {p.axis.toLowerCase()} with a green dot for 1-day delivery.</span></div>
                </div>
              )}
              <div className="r">
                <span className="ic" style={{ background: '#e7eefc', color: '#2648a6' }}><Ic.truck width={20} height={20} /></span>
                <div><b>Delivery by {regularBy(now)}</b><span>Shipped by the seller from {p.sellerCity.split(',')[0]} · free delivery</span></div>
              </div>
            </>
          )}
          <div className="r">
            <span className="ic" style={{ background: '#fdeff8', color: 'var(--plum)' }}><Ic.cash width={20} height={20} /></span>
            <div><b>Cash on delivery available</b><span>Or pay online (simulated in this demo)</span></div>
          </div>
        </div>
      </section>
      <div className="mq-div" />

      <section className="mq-sec">
        <div className="mq-h"><h2 style={{ fontSize: 15 }}>Product details</h2></div>
        <ul className="mq-ul">{p.about.map((a) => <li key={a}>{a}</li>)}</ul>
        <dl className="mq-kv" style={{ marginTop: 14 }}>
          <dt>Sold by</dt><dd>{p.seller}</dd>
          <dt>Category</dt><dd>{p.catName} · {p.sub}</dd>
          <dt>Weight</dt><dd>{p.weight}</dd>
          <dt>Product code</dt><dd>{p.id}</dd>
        </dl>
      </section>

      <div className="mq-cta">
        <button className="mq-btn out" onClick={() => add(false)} disabled={mode === 'loading'}><Ic.cart width={20} height={20} />Add to cart</button>
        <button className="mq-btn pri" onClick={() => add(true)} disabled={mode === 'loading'}>{quick ? <><Ic.boltF width={16} height={16} />Buy now</> : 'Buy now'}</button>
      </div>
    </>
  );
}
