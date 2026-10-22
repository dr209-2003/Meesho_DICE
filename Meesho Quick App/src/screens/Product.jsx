import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { QUICK_HUB, inQuickZone, productById } from '../shared/catalog';
import { availableFor } from '../shared/ops';
import { useBack, useCartView, useQuick } from './App';
import { CartBtn, Empty, Ic, Rating, TopBar, quickBy, regularBy, rupee } from './ui';

export default function Product() {
  const { id } = useParams();
  const p = productById(id);
  const back = useBack('/');
  const navigate = useNavigate();
  const { avail, mode, now } = useShared();
  const { area, addToCart, customer, toast, toggleWish, setPrepaid, openLocation } = useQuick();
  const { count } = useCartView();
  const zone = inQuickZone(area);
  const [variant, setVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [slide, setSlide] = useState(0);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState(false);
  const track = useRef(null);

  useEffect(() => {
    if (!p || variant || mode === 'loading') return;
    setVariant(p.options.find((o) => zone && availableFor(avail, p.id, o) > 0) || p.options[0]);
  }, [p, variant, avail, zone, mode]);

  if (!p) return (<><TopBar title="Product" onBack={back} /><Empty icon="search" title="Product not found" text="It may have been removed from the catalogue." action={<Link to="/" className="btn pri sm">Go home</Link>} /></>);

  const v = variant || p.options[0];
  const left = availableFor(avail, p.id, v);
  const anyNear = availableFor(avail, p.id) > 0;
  const quick = zone && left > 0;
  const sameDay = quick && area.km <= 15 && (() => { try { return sessionStorage.getItem('qtile') === 'today'; } catch { return false; } })();
  const eta = sameDay ? 'today' : 'in 1–2 days';
  const inCart = customer.cart.filter((l) => l.skuId === p.id && l.variant === v && l.mode === 'quick').reduce((n, l) => n + l.qty, 0);
  const maxQty = quick ? Math.max(0, Math.min(5, left - inCart)) : 5;
  const q = Math.min(qty, Math.max(1, maxQty));
  const wished = (customer.wish || []).includes(p.id);

  const go = (i) => { setSlide(i); track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' }); };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: p.title, url });
      else { await navigator.clipboard.writeText(url); toast('Link copied'); }
    } catch { /* cancelled */ }
  };
  const add = (buy) => {
    setErr('');
    if (mode === 'loading') return;
    if (quick && maxQty < 1) { setErr(`All ${left} unit${left > 1 ? 's' : ''} near you are already in your cart.`); return; }
    addToCart(p.id, v, q, quick ? 'quick' : 'regular');
    if (buy) { setPrepaid(true); navigate('/checkout'); } else toast(quick ? `Added · arrives ${eta}` : 'Added to cart', ['View cart', '/cart']);
  };

  return (
    <>
      <TopBar title="" onBack={back} line={false} right={<>
        <Link to="/search" className="ib" aria-label="Search"><Ic.search /></Link>
        <button className="ib" onClick={() => { toggleWish(p.id); toast(wished ? 'Removed from wishlist' : 'Saved to wishlist'); }} aria-pressed={wished} aria-label="Wishlist" style={{ color: wished ? 'var(--pink)' : undefined }}>{wished ? <Ic.heartF /> : <Ic.heart />}</button>
        <CartBtn count={count} />
      </>} />

      <div className="gal" style={{ margin: '0 14px', borderRadius: 16, overflow: 'hidden' }}>
        <div className="track" ref={track} onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {p.views.map((pos, i) => <div key={i} className="slide"><img src={p.img} alt={`${p.title}, image ${i + 1} of ${p.views.length}`} style={{ objectPosition: pos, transform: i ? 'scale(1.35)' : undefined, transformOrigin: pos }} /></div>)}
        </div>
        <button className="share" onClick={share} aria-label="Share"><Ic.share width={18} height={18} /></button>
        <span className="count">{slide + 1}/{p.views.length}</span>
      </div>
      <div className="dots">{p.views.map((_, i) => <button key={i} className={slide === i ? 'on' : ''} onClick={() => go(i)} aria-label={`Image ${i + 1}`} />)}</div>

      {quick ? (
        <button className="near" onClick={() => setInfo(true)}>
          <Ic.pinF className="pin" width={24} height={24} />
          <span><b>Available near you</b><span>Get it {eta}</span></span>
          <Ic.chev className="chev" width={18} height={18} />
        </button>
      ) : (
        <button className="near no" onClick={zone ? () => setInfo(true) : openLocation}>
          <Ic.truck className="pin" width={22} height={22} />
          <span><b>{zone ? (anyNear ? `${v} is sold out near you` : 'Not held near you right now') : `Quick isn’t in ${area.name}`}</b><span>Standard delivery by {regularBy(now)}</span></span>
          <Ic.chev className="chev" width={18} height={18} />
        </button>
      )}

      <section className="pdp">
        <h2>{p.title}</h2>
        <Rating p={p} />
        <div className="price" style={{ marginTop: 6 }}><b>{rupee(p.price)}</b><s>{rupee(p.mrp)}</s><em>{p.off}% OFF</em></div>
      </section>

      {quick && (
        <button className={'payfast' + (customer.prepaid ? ' on' : '')} onClick={() => { setPrepaid(true); toast('Pay online selected · ₹20 off at checkout'); }} aria-pressed={!!customer.prepaid}>
          <i><Ic.card width={20} height={20} /></i>
          <span><b>Pay online &amp; get ₹20 off</b><span>Pay online to get it from local inventory {eta}.</span></span>
          {customer.prepaid ? <Ic.check className="chev" width={18} height={18} /> : <Ic.chev className="chev" width={18} height={18} />}
        </button>
      )}

      <div className="chips3" style={{ marginTop: quick ? 0 : 10 }}>
        <div><Ic.ret width={17} height={17} />7 Days Return</div>
        <div><Ic.store width={17} height={17} />{quick ? 'Local Inventory' : 'Seller stock'}</div>
        <div><Ic.card width={17} height={17} />{quick ? 'Pay online, ₹20 off' : 'COD available'}</div>
      </div>

      <section className="block">
        <h3>Select {p.axis.toLowerCase()}: <span style={{ color: 'var(--pink)' }}>{v}</span></h3>
        <div className="vars" role="radiogroup" aria-label={p.axis}>
          {p.options.map((o) => {
            const n = availableFor(avail, p.id, o);
            return (
              <button key={o} role="radio" aria-checked={o === v} className={'var' + (o === v ? ' on' : '')} onClick={() => { setVariant(o); setQty(1); setErr(''); }}>
                {zone && n > 0 && <i aria-hidden="true" />}{o}{zone && n > 0 && <span className="sr">, available near you</span>}
              </button>
            );
          })}
        </div>
        {zone && anyNear && <div className="mut" style={{ fontSize: 12, marginTop: 8 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: 'var(--green)', marginRight: 6 }} />In stock near you, delivered {eta}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <b style={{ fontSize: 13.5, fontWeight: 600 }}>Quantity</b>
          <div className="qty">
            <button onClick={() => setQty(Math.max(1, q - 1))} disabled={q <= 1} aria-label="Decrease quantity">−</button>
            <span aria-live="polite">{q}</span>
            <button onClick={() => setQty(Math.min(maxQty, q + 1))} disabled={q >= maxQty} aria-label="Increase quantity">+</button>
          </div>
          {quick && <span style={{ fontSize: 12, color: left <= 2 ? 'var(--err)' : 'var(--mut)', fontWeight: left <= 2 ? 600 : 400 }}>{left <= 2 ? `Only ${left} left near you` : `${left} near you`}</span>}
        </div>
        {err && <div className="note e" style={{ marginTop: 12 }} role="alert"><Ic.info width={16} height={16} />{err}</div>}
      </section>
      <div className="div" />

      <section className="block">
        <h3>Delivery to {area.pin} ({area.name})</h3>
        <div className="note" style={{ background: quick ? 'var(--green-t)' : '#f6f4f8', color: quick ? '#0a5d36' : 'var(--ink2)' }}>
          {quick ? <Ic.boltF width={18} height={18} /> : <Ic.truck width={18} height={18} />}
          <span>{quick ? <><b>Arrives {sameDay ? 'today' : `by ${quickBy(now)}`}</b> from {QUICK_HUB.name}, {area.km} km away. Quality-checked at the hub, same price as the regular listing.</> : <><b>Arrives {regularBy(now)}</b>, shipped by the seller from {p.sellerCity}. Free delivery, cash on delivery available.</>}</span>
        </div>
      </section>
      <div className="div" />

      <section className="block">
        <h3>Product details</h3>
        <ul className="ul">{p.about.map((a) => <li key={a}>{a}</li>)}</ul>
        <dl className="kv"><dt>Sold by</dt><dd>{p.seller}, {p.sellerCity}</dd><dt>Product ID</dt><dd>{p.id}</dd></dl>
      </section>

      <div className="cta">
        <button className="btn out" onClick={() => add(false)} disabled={mode === 'loading'}><Ic.cart width={20} height={20} />Add to Cart</button>
        <button className="btn pri" onClick={() => add(true)} disabled={mode === 'loading'}><span>Buy Now{quick && <small>(Pay online · ₹20 off)</small>}</span></button>
      </div>

      {info && (
        <>
          <div className="scrim" onClick={() => setInfo(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Why this is fast">
            <div className="grab" />
            <h3>{quick ? 'This exact item is near you' : 'Delivery details'}</h3>
            <p className="mut" style={{ fontSize: 13, lineHeight: 1.55, margin: '6px 0 14px' }}>
              {quick
                ? `It is a ${p.short.toLowerCase()} that could not be delivered to another customer. Instead of travelling back to the seller, it is held at ${QUICK_HUB.name}, ${area.km} km from you. It passed a 3-point quality check and is sold at the same price.`
                : `This size is not held near you right now, so the seller ships it from ${p.sellerCity}.`}
            </p>
            {quick && <div className="note q" style={{ marginBottom: 14 }}><Ic.shield width={16} height={16} /><span>{left} unit{left > 1 ? 's' : ''} of size {v} at the hub · arrives {sameDay ? 'today' : `by ${quickBy(now)}`}</span></div>}
            <button className="btn pri" style={{ width: '100%' }} onClick={() => setInfo(false)}>Got it</button>
          </div>
        </>
      )}
    </>
  );
}
