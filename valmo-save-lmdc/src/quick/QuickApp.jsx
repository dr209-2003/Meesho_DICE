import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { AREAS, areaById, inQuickZone, productById } from '../shared/catalog';
import { availableFor } from '../shared/ops';
import { Ic } from './ui';
import './quick.css';

const LS = 'meesho-quick-customer-v1';
const Ctx = createContext(null);

function loadCustomer() {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { id: 'C-' + Math.random().toString(36).slice(2, 10).toUpperCase(), areaId: 'saket', cart: [], address: null };
}

export function QuickProvider({ children }) {
  const [c, setC] = useState(loadCustomer);
  const [toastMsg, setToast] = useState(null);
  const tm = useRef();
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(c)); } catch { /* ignore */ } }, [c]);

  const toast = useCallback((msg, link) => {
    clearTimeout(tm.current);
    setToast({ msg, link });
    tm.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const api = useMemo(() => ({
    customer: c,
    area: areaById(c.areaId) || AREAS[2],
    setArea: (areaId) => setC((x) => ({ ...x, areaId })),
    setAddress: (address) => setC((x) => ({ ...x, address })),
    addToCart: (skuId, variant, qty, mode) => setC((x) => {
      const key = `${skuId}|${variant}|${mode}`;
      const has = x.cart.find((l) => l.key === key);
      const cart = has ? x.cart.map((l) => (l.key === key ? { ...l, qty: Math.min(5, l.qty + qty) } : l)) : [...x.cart, { key, skuId, variant, qty, mode }];
      return { ...x, cart };
    }),
    setQty: (key, qty) => setC((x) => ({ ...x, cart: x.cart.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(5, qty)) } : l)) })),
    setMode: (key, mode) => setC((x) => {
      const l = x.cart.find((y) => y.key === key);
      const nk = `${l.skuId}|${l.variant}|${mode}`;
      const other = x.cart.find((y) => y.key === nk);
      const rest = x.cart.filter((y) => y.key !== key && y.key !== nk);
      return { ...x, cart: [...rest, { ...l, key: nk, mode, qty: Math.min(5, l.qty + (other ? other.qty : 0)) }] };
    }),
    remove: (key) => setC((x) => ({ ...x, cart: x.cart.filter((l) => l.key !== key) })),
    clearCart: (keys) => setC((x) => ({ ...x, cart: keys ? x.cart.filter((l) => !keys.includes(l.key)) : [] })),
    toast,
  }), [c, toast]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {toastMsg && (
        <div className="mq-toast" role="status">
          <Ic.check width={18} height={18} />
          <span>{toastMsg.msg}{toastMsg.link && <Link to={toastMsg.link[1]}>{toastMsg.link[0]}</Link>}</span>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useQuick = () => useContext(Ctx);

/** Cart lines enriched with live stock and any problem that blocks checkout. */
export function useCartView() {
  const { customer, area } = useQuick();
  const { avail, mode } = useShared();
  const zone = inQuickZone(area);
  const lines = customer.cart.map((l) => {
    const p = productById(l.skuId);
    const left = availableFor(avail, l.skuId, l.variant);
    let issue = null;
    if (l.mode === 'quick') {
      if (!zone) issue = { kind: 'zone', text: `Meesho Quick doesn’t deliver to ${area.name} yet` };
      else if (left === 0) issue = { kind: 'sold', text: 'Sold out near you' };
      else if (left < l.qty) issue = { kind: 'few', text: `Only ${left} left near you` };
    }
    return { ...l, p, left, issue };
  });
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * l.p.price, 0);
  const mrp = lines.reduce((n, l) => n + l.qty * l.p.mrp, 0);
  return { lines, count, total, mrp, blocked: mode === 'loading' || lines.some((l) => l.issue), zone };
}

const TABS = [
  ['/quick', 'Home', 'home', true],
  ['/quick/categories', 'Categories', 'grid'],
  ['/quick/near-you', 'Quick', 'bolt'],
  ['/quick/orders', 'Orders', 'box'],
  ['/quick/account', 'Account', 'user'],
];
const NO_NAV = ['/quick/p/', '/quick/cart', '/quick/checkout'];

export default function QuickShell() {
  const { pathname } = useLocation();
  const { mode, sync, retry, avail } = useShared();
  const { area } = useQuick();
  const nav = !NO_NAV.some((p) => pathname.startsWith(p));
  const quickCount = inQuickZone(area) ? Object.values(avail).reduce((a, b) => a + b, 0) : 0;
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => { document.title = 'Meesho Quick · Valmo-SAVE'; return () => { document.title = 'Valmo-SAVE · LMDC Dashboard'; }; }, []);

  return (
    <div className="mq-root">
      <div className="mq">
        {mode === 'local' && (
          <div className="mq-modebar" role="note"><Ic.info width={14} height={14} /> Demo mode: stock and orders are saved in this browser only (shared server not configured).</div>
        )}
        {mode === 'shared' && sync.error && (
          <div className="mq-modebar err" role="alert"><Ic.info width={14} height={14} /> Can’t reach the server. Showing last known stock. <button onClick={retry}>Retry</button></div>
        )}
        <main className={'mq-main' + (nav ? '' : ' has-cta')}><Outlet /></main>
        {nav && (
          <nav className="mq-nav" aria-label="Main">
            {TABS.map(([to, label, icon, end]) => {
              const I = Ic[icon];
              return (
                <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'on' : '')}>
                  <I width={22} height={22} />
                  {label}
                  {icon === 'bolt' && quickCount > 0 && <span className="qdot">{quickCount}</span>}
                </NavLink>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

export function useBack(fallback = '/quick') {
  const navigate = useNavigate();
  return () => (window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate(fallback));
}
