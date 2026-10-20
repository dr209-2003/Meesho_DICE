import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductArt from './ProductArt';
import { AREAS, RADIUS_KM, inQuickZone } from '../shared/catalog';

const mk = (d, fill) => (p) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{d}</svg>
);
export const Ic = {
  home: mk(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>),
  grid: mk(<><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>),
  bolt: mk(<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />),
  boltF: mk(<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />, true),
  box: mk(<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>),
  user: mk(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>),
  cart: mk(<><path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.5L21 8H6" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></>),
  search: mk(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>),
  back: mk(<path d="M15 5l-7 7 7 7" />),
  pin: mk(<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>),
  check: mk(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  info: mk(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>),
  truck: mk(<><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7" /><circle cx="6" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>),
  shield: mk(<><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>),
  store: mk(<path d="M3 9l1.5-5h15L21 9M3 9h18v11H3zM9 20v-6h6v6" />),
  x: mk(<path d="M6 6l12 12M18 6L6 18" />),
  wallet: mk(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></>),
  cash: mk(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>),
  chev: mk(<path d="M9 6l6 6-6 6" />),
  refresh: mk(<><path d="M20 12a8 8 0 01-14 5l-2-2M4 12a8 8 0 0114-5l2 2" /><path d="M20 4v5h-5M4 20v-5h5" /></>),
  star: mk(<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />, true),
};

export const rupee = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (t) => { const d = new Date(t); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const fmtTime = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const quickBy = (now) => fmtDay(now + 86400000);
export const regularBy = (now) => `${fmtDay(now + 5 * 86400000)} – ${fmtDay(now + 7 * 86400000).split(', ')[1]}`;

export function TopBar({ title, onBack, right, children }) {
  return (
    <header className="mq-top">
      <div className="mq-bar" style={{ paddingLeft: onBack ? 4 : 16 }}>
        {onBack && <button className="mq-ib" onClick={onBack} aria-label="Back"><Ic.back /></button>}
        <h1>{title}</h1>
        {right}
      </div>
      {children}
    </header>
  );
}

export function CartButton({ count }) {
  return (
    <Link to="/quick/cart" className="mq-ib" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
      <Ic.cart />
      {count > 0 && <span className="cnt">{count}</span>}
    </Link>
  );
}

export function LocationRow({ area, onOpen }) {
  const zone = inQuickZone(area);
  return (
    <button className="mq-loc" onClick={onOpen} aria-label={`Delivery location ${area.name}. Change`}>
      <Ic.pin width={18} height={18} style={{ color: 'var(--plum)', flex: 'none' }} />
      <span>Deliver to <b>{area.name}, {area.pin}</b></span>
      {zone ? <span className="mq-chip-q"><Ic.boltF width={11} height={11} />Quick</span> : <span className="mq-badge" style={{ background: '#efeff5', color: 'var(--ink2)' }}>No Quick</span>}
      <span className="chev">Change</span>
    </button>
  );
}

export function LocationSheet({ open, onClose, area, onPick }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  if (!open) return null;
  const tryPin = (e) => {
    e.preventDefault();
    const a = AREAS.find((x) => x.pin === pin.trim());
    if (!/^\d{6}$/.test(pin.trim())) return setErr('Enter a 6-digit pincode');
    if (!a) return setErr('This demo covers the pincodes listed below. Pick one of them.');
    onPick(a.id);
  };
  return (
    <>
      <div className="mq-scrim" onClick={onClose} />
      <div className="mq-sheet" role="dialog" aria-modal="true" aria-label="Choose delivery location">
        <div className="grab" />
        <h3>Choose delivery location</h3>
        <p className="mq-sub" style={{ margin: '0 0 12px' }}>Meesho Quick delivers within {RADIUS_KM} km of the Okhla LMDC, where returned stock is held.</p>
        <form onSubmit={tryPin} className="row" style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <div className={'mq-field' + (err ? ' bad' : '')} style={{ flex: 1, margin: 0 }}>
            <label htmlFor="pin" className="sr-only">Pincode</label>
            <input id="pin" inputMode="numeric" maxLength={6} placeholder="Enter pincode" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }} />
          </div>
          <button type="submit" className="mq-btn out sm" style={{ height: 46 }}>Apply</button>
        </form>
        {err && <div className="mq-sub" style={{ color: 'var(--err)', marginBottom: 6 }}>{err}</div>}
        {AREAS.map((a) => (
          <button key={a.id} className={'mq-opt' + (a.id === area.id ? ' on' : '')} onClick={() => onPick(a.id)}>
            <Ic.pin width={18} height={18} style={{ color: a.id === area.id ? 'var(--plum)' : 'var(--mut)', flex: 'none' }} />
            <span className="t"><b>{a.name}</b><span>{a.city} {a.pin} · {a.km} km from hub</span></span>
            {inQuickZone(a) ? <span className="mq-chip-q"><Ic.boltF width={11} height={11} />1 day</span> : <span className="mq-sub">5–7 days</span>}
          </button>
        ))}
      </div>
    </>
  );
}

export function ProductCard({ p, left, quickArea, sold, from }) {
  const quick = quickArea && left > 0;
  return (
    <Link to={`/quick/p/${p.id}${from ? '?from=' + from : ''}`} className={'mq-card' + (sold ? ' sold' : '')}>
      <div className="img">
        <ProductArt product={p} />
        {quick && <span className="mq-flag"><Ic.boltF width={10} height={10} />QUICK</span>}
        {sold && <span className="mq-flag sold">Sold out near you</span>}
        {quick && left <= 2 && <span className="mq-left">Only {left} left</span>}
      </div>
      <div className="body">
        <span className="t">{p.title}</span>
        <span className="p"><b>{rupee(p.price)}</b><s>{rupee(p.mrp)}</s><em>{p.off}% off</em></span>
        {quick ? <span className="mq-chip-q"><Ic.boltF width={10} height={10} />Get it within 1 day</span> : <span className="mq-chip-n"><Ic.truck width={13} height={13} />Free delivery</span>}
        <span className="row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span className={'mq-rate' + (p.rating < 4 ? ' lo' : '')}>{p.rating}<Ic.star width={9} height={9} /></span>
          <span className="mq-sub" style={{ fontSize: 11 }}>{p.ratings.toLocaleString('en-IN')}</span>
        </span>
      </div>
    </Link>
  );
}

export function SkeletonGrid({ n = 4 }) {
  return (
    <div className="mq-grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="mq-card" style={{ padding: 0 }}>
          <div className="mq-skel" style={{ aspectRatio: '1 / 1.08', borderRadius: 0 }} />
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="mq-skel" style={{ height: 12, width: '85%' }} />
            <div className="mq-skel" style={{ height: 16, width: '55%' }} />
            <div className="mq-skel" style={{ height: 12, width: '65%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon = 'box', title, text, action }) {
  const I = Ic[icon];
  return (
    <div className="mq-empty">
      <div className="em"><I width={40} height={40} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export const STATUS = {
  placed: ['Order placed', '#e7eefc', '#2648a6'],
  packed: ['Packed', '#fef3dc', '#7a5200'],
  dispatched: ['Out for delivery', '#efe7fd', '#4a23a3'],
  delivered: ['Delivered', '#e3f6ee', '#02684a'],
  cancelled: ['Cancelled', '#fde6ee', '#c0264f'],
};
export const StatusPill = ({ s }) => <span className="mq-st" style={{ background: STATUS[s][1], color: STATUS[s][2] }}>{STATUS[s][0]}</span>;
