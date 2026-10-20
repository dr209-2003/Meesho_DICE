import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AREAS, RADIUS_KM, inQuickZone } from '../shared/catalog';

const mk = (d, fill) => (p) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{d}</svg>
);
export const Ic = {
  home: mk(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></>),
  homeF: mk(<path d="M12 3.2l9 7V21h-6v-6.5H9V21H3V10.2l9-7z" />, true),
  grid: mk(<><rect x="4" y="4" width="6.5" height="6.5" rx="3.2" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="3.2" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="3.2" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="3.2" /></>),
  bolt: mk(<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />),
  boltF: mk(<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />, true),
  box: mk(<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>),
  user: mk(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>),
  cart: mk(<><path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.5L21 8H6" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></>),
  heart: mk(<path d="M12 20s-7-4.4-9.2-8.6C1.2 8.3 3 5 6.4 5c2 0 3.3 1.1 4 2.3h3.2C14.3 6.1 15.6 5 17.6 5 21 5 22.8 8.3 21.2 11.4 19 15.6 12 20 12 20z" />),
  heartF: mk(<path d="M12 20s-7-4.4-9.2-8.6C1.2 8.3 3 5 6.4 5c2 0 3.3 1.1 4 2.3h3.2C14.3 6.1 15.6 5 17.6 5 21 5 22.8 8.3 21.2 11.4 19 15.6 12 20 12 20z" />, true),
  search: mk(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>),
  camera: mk(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  back: mk(<path d="M15 5l-7 7 7 7" />),
  chev: mk(<path d="M9 6l6 6-6 6" />),
  pin: mk(<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>),
  pinF: mk(<path d="M12 21.5s-7.5-6.4-7.5-12A7.5 7.5 0 0112 2a7.5 7.5 0 017.5 7.5c0 5.6-7.5 12-7.5 12zm0-9a3 3 0 100-6 3 3 0 000 6z" />, true),
  check: mk(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  info: mk(<><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></>),
  truck: mk(<><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7" /><circle cx="6" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>),
  shield: mk(<><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>),
  x: mk(<path d="M6 6l12 12M18 6L6 18" />),
  wallet: mk(<><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10.5h18" /><path d="M15.5 15h2" /></>),
  card: mk(<><rect x="3" y="6" width="18" height="12" rx="3" /><path d="M3 10.5h18" /></>),
  cash: mk(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>),
  share: mk(<><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" /><path d="M5 12v7h14v-7" /></>),
  star: mk(<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z" />, true),
  clock: mk(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  cal: mk(<><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /><path d="M9 14h2v2H9z" fill="currentColor" stroke="none" /></>),
  minusC: mk(<><rect x="4" y="6" width="16" height="12" rx="6" /><path d="M8.5 12h7" /></>),
  store: mk(<><path d="M4 9l1.5-4.5h13L20 9" /><path d="M4 9h16v2.5a2.7 2.7 0 01-5.3 0 2.7 2.7 0 01-5.4 0A2.7 2.7 0 014 11.5z" /><path d="M5.5 13.5V20h13v-6.5" /></>),
  percent: mk(<><path d="M18 6L6 18" /><circle cx="7.5" cy="7.5" r="2" /><circle cx="16.5" cy="16.5" r="2" /></>),
  ret: mk(<><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></>),
  badge: mk(<><path d="M12 2.8l2.4 1.8 3-.1.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.1L12 21.2l-2.4-1.8-3 .1-.9-2.9-2.4-1.8 1-2.8-1-2.8 2.4-1.8.9-2.9 3 .1z" /><path d="M9 12l2 2 4-4" /></>),
  refresh: mk(<><path d="M20 12a8 8 0 01-14 5l-2-2M4 12a8 8 0 0114-5l2 2" /><path d="M20 4v5h-5M4 20v-5h5" /></>),
};

export const rupee = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const kfmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n));
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (t) => { const d = new Date(t); return `${DAYS[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`; };
export const fmtTime = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
export const quickBy = (now) => fmtDay(now + 86400000);
export const regularBy = (now) => `${fmtDay(now + 5 * 86400000)} – ${fmtDay(now + 7 * 86400000).split(', ')[1]}`;

export const QuickLogo = ({ size = 22 }) => (
  <span className="qlogo" style={{ fontSize: size }}><Ic.boltF className="bolt" width={size * 0.95} height={size * 0.95} />meesho <b>Quick</b></span>
);

export function TopBar({ title, onBack, right, children, line = true }) {
  return (
    <header className={'top' + (line ? ' line' : '')}>
      <div className={'bar' + (onBack ? ' back' : '')}>
        {onBack && <button className="ib" onClick={onBack} aria-label="Back"><Ic.back /></button>}
        <h1>{title}</h1>
        {right}
      </div>
      {children}
    </header>
  );
}

export const CartBtn = ({ count }) => (
  <Link to="/cart" className="ib" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}><Ic.cart />{count > 0 && <span className="cnt">{count}</span>}</Link>
);

export function LocationRow({ area, onOpen }) {
  return (
    <button className="loc" onClick={onOpen} aria-label={`Deliver to ${area.pin} ${area.name}. Change location`}>
      <Ic.pinF width={20} height={20} style={{ color: 'var(--pink)', flex: 'none' }} />
      <span className="tx">Deliver to <b>{area.pin} ({area.name})</b></span>
      {!inQuickZone(area) && <span className="badge" style={{ background: '#efedf2', color: 'var(--ink2)' }}>No Quick</span>}
      <Ic.chev width={18} height={18} />
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
    if (!a) return setErr('This demo covers the pincodes listed below.');
    onPick(a.id);
  };
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Choose delivery location">
        <div className="grab" />
        <h3>Choose delivery location</h3>
        <p className="mut" style={{ margin: '0 0 12px', fontSize: 12.5 }}>Meesho Quick delivers products already held at the Valmo hub in Delhi South to buyers within {RADIUS_KM} km.</p>
        <form onSubmit={tryPin} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <div className={'fld' + (err ? ' bad' : '')} style={{ flex: 1, margin: 0 }}>
            <label htmlFor="pin" className="sr">Pincode</label>
            <input id="pin" inputMode="numeric" maxLength={6} placeholder="Enter pincode" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErr(''); }} />
          </div>
          <button type="submit" className="btn out sm" style={{ height: 46 }}>Apply</button>
        </form>
        {err && <div style={{ color: 'var(--err)', fontSize: 12, marginBottom: 6 }}>{err}</div>}
        {AREAS.map((a) => (
          <button key={a.id} className={'row-opt' + (a.id === area.id ? ' on' : '')} onClick={() => onPick(a.id)}>
            <Ic.pin width={18} height={18} style={{ color: a.id === area.id ? 'var(--pink)' : 'var(--mut)', flex: 'none' }} />
            <span className="t"><b>{a.pin} · {a.name}</b><span>{a.city} · {a.km} km from the hub</span></span>
            {inQuickZone(a) ? <span className="badge" style={{ background: 'var(--green-t)', color: 'var(--green)' }}>1–2 days</span> : <span className="mut" style={{ fontSize: 12 }}>5–7 days</span>}
          </button>
        ))}
      </div>
    </>
  );
}

export function Rating({ p }) {
  return <span className="rate"><b>{p.rating}<Ic.star width={10} height={10} /></b>({kfmt(p.ratings)})</span>;
}

export function ProductCard({ p, left, quickArea, sold, wish, onWish }) {
  const quick = quickArea && left > 0;
  return (
    <div className={'card' + (sold ? ' sold' : '')}>
      <Link to={`/p/${p.id}`} className="im" aria-label={p.title}>
        <img src={p.img} alt="" loading="lazy" />
        {quick && <span className="qbadge"><Ic.boltF width={12} height={12} />meesho Quick</span>}
        {sold && <span className="soldtag">Sold out near you</span>}
        {quick && left <= 2 && <span className="lefttag">Only {left} left</span>}
      </Link>
      <button className={'heart' + (wish ? ' on' : '')} onClick={onWish} aria-pressed={!!wish} aria-label={wish ? 'Remove from wishlist' : 'Add to wishlist'}>
        {wish ? <Ic.heartF width={17} height={17} /> : <Ic.heart width={17} height={17} />}
      </button>
      <Link to={`/p/${p.id}`} className="bd">
        <span className="t">{p.title}</span>
        <Rating p={p} />
        <span className="price"><b>{rupee(p.price)}</b><s>{rupee(p.mrp)}</s><em>{p.off}% OFF</em></span>
        {quick ? (
          <span className="pay"><i><Ic.wallet width={14} height={14} /></i><span><b>Pay Online</b>Get it in 1–2 days</span></span>
        ) : (
          <span className="pay std"><i><Ic.truck width={14} height={14} /></i><span><b>Free delivery</b>Arrives in 5–7 days</span></span>
        )}
      </Link>
    </div>
  );
}

export function SkeletonGrid({ n = 4 }) {
  return (
    <div className="grid" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card">
          <div className="sk" style={{ aspectRatio: '1 / 1', borderRadius: 0 }} />
          <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="sk" style={{ height: 12, width: '85%' }} /><div className="sk" style={{ height: 16, width: '55%' }} /><div className="sk" style={{ height: 30 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon = 'box', title, text, action }) {
  const I = Ic[icon];
  return (
    <div className="empty">
      <div className="em"><I width={40} height={40} /></div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export const STATUS = {
  placed: ['Order placed', '#e9effd', '#2648a6'],
  packed: ['Packed', '#fff4dd', '#7a5200'],
  dispatched: ['Out for delivery', '#efe7fd', '#4a23a3'],
  delivered: ['Delivered', '#e7f6ee', '#0a5d36'],
  cancelled: ['Cancelled', '#fde7ee', '#c62853'],
};
export const StatusPill = ({ s }) => <span className="st" style={{ background: STATUS[s][1], color: STATUS[s][2] }}>{STATUS[s][0]}</span>;
