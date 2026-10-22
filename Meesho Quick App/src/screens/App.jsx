import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useShared } from '../shared/SharedStore';
import { AREAS, areaById, inQuickZone, productById } from '../shared/catalog';
import { availableFor } from '../shared/ops';
import { Ic, LocationSheet } from './ui';

const LS = 'meesho-quick-app-customer-v1';
const Ctx = createContext(null);

function loadCustomer() {
  try { const raw = localStorage.getItem(LS); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  return { id: 'C-' + Math.random().toString(36).slice(2, 10).toUpperCase(), areaId: 'cp', cart: [], address: null, wish: [], prepaid: true };
}

export function QuickProvider({ children }) {
  const [c, setC] = useState(loadCustomer);
  const [toastMsg, setToast] = useState(null);
  const [locOpen, setLocOpen] = useState(false);
  const tm = useRef();
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify(c)); } catch { /* ignore */ } }, [c]);
  const toast = useCallback((msg, link) => {
    clearTimeout(tm.current);
    setToast({ msg, link });
    tm.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const api = useMemo(() => ({
    customer: c,
    area: areaById(c.areaId) || AREAS[0],
    setArea: (areaId) => setC((x) => ({ ...x, areaId })),
    openLocation: () => setLocOpen(true),
    setAddress: (address) => setC((x) => ({ ...x, address })),
    setPrepaid: (prepaid) => setC((x) => ({ ...x, prepaid })),
    toggleWish: (id) => setC((x) => ({ ...x, wish: (x.wish || []).includes(id) ? x.wish.filter((w) => w !== id) : [...(x.wish || []), id] })),
    addToCart: (skuId, variant, qty, mode) => setC((x) => {
      const key = `${skuId}|${variant}|${mode}`;
      const has = x.cart.find((l) => l.key === key);
      return { ...x, cart: has ? x.cart.map((l) => (l.key === key ? { ...l, qty: Math.min(5, l.qty + qty) } : l)) : [...x.cart, { key, skuId, variant, qty, mode }] };
    }),
    setQty: (key, qty) => setC((x) => ({ ...x, cart: x.cart.map((l) => (l.key === key ? { ...l, qty: Math.max(1, Math.min(5, qty)) } : l)) })),
    setMode: (key, mode) => setC((x) => {
      const l = x.cart.find((y) => y.key === key);
      const nk = `${l.skuId}|${l.variant}|${mode}`;
      const other = x.cart.find((y) => y.key === nk);
      return { ...x, cart: [...x.cart.filter((y) => y.key !== key && y.key !== nk), { ...l, key: nk, mode, qty: Math.min(5, l.qty + (other ? other.qty : 0)) }] };
    }),
    remove: (key) => setC((x) => ({ ...x, cart: x.cart.filter((l) => l.key !== key) })),
    clearCart: (keys) => setC((x) => ({ ...x, cart: keys ? x.cart.filter((l) => !keys.includes(l.key)) : [] })),
    toast,
  }), [c, toast]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <LocationSheet open={locOpen} area={api.area} onClose={() => setLocOpen(false)} onPick={(id) => { api.setArea(id); setLocOpen(false); toast('Delivery location updated'); }} />
      {toastMsg && (
        <div className="toast" role="status"><Ic.check width={18} height={18} /><span>{toastMsg.msg}{toastMsg.link && <Link to={toastMsg.link[1]}>{toastMsg.link[0]}</Link>}</span></div>
      )}
    </Ctx.Provider>
  );
}
export const useQuick = () => useContext(Ctx);

/** Cart lines with live stock and anything that blocks checkout. */
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
  }).filter((l) => l.p);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * l.p.price, 0);
  const mrp = lines.reduce((n, l) => n + l.qty * l.p.mrp, 0);
  return { lines, count, total, mrp, blocked: mode === 'loading' || lines.some((l) => l.issue), zone };
}

const TABS = [['/', 'Home', 'home', true], ['/categories', 'Categories', 'grid'], ['/quick', 'Quick', 'bolt'], ['/orders', 'Orders', 'box'], ['/account', 'Account', 'user']];
const NO_NAV = ['/p/', '/cart', '/checkout'];

export default function Shell() {
  const { pathname } = useLocation();
  const { mode, sync, retry, avail } = useShared();
  const { area } = useQuick();
  const nav = !NO_NAV.some((p) => pathname.startsWith(p));
  const near = inQuickZone(area) ? Object.values(avail).reduce((a, b) => a + b, 0) : 0;
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="app">
      {mode === 'local' && <div className="modebar" role="note"><Ic.info width={14} height={14} />Demo mode: stock and orders are saved in this browser only.</div>}
      {mode === 'shared' && sync.error && <div className="modebar err" role="alert"><Ic.info width={14} height={14} />Can’t reach the server. Showing last known stock.<button onClick={retry}>Retry</button></div>}
      <main className={'main' + (nav ? '' : ' has-cta')}><Outlet /></main>
      {nav && (
        <nav className="nav" aria-label="Main">
          {TABS.map(([to, label, icon, end]) => {
            const I = Ic[icon];
            return (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'on' : '')}>
                <I width={23} height={23} />{label}{icon === 'bolt' && near > 0 && <span className="qd">{near}</span>}
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function useBack(fallback = '/') {
  const navigate = useNavigate();
  return () => (window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate(fallback));
}
