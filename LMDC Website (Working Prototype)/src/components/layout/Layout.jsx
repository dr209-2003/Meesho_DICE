import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../state/AppState';
import { HUB } from '../../data/ops';
import { NOW } from '../../lib/format';
import { IconBell, IconCal, IconMenu } from '../ui/Icons';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/rto', label: 'RTO & Retain', tag: 'SAVE' },
  { to: '/dispatch', label: 'LMSC Dispatch' },
  { to: '/shelf', label: 'Hold Shelf' },
  { to: '/sku/MS-KR-20431', label: 'SKU Detail', match: '/sku' },
  { to: '/tasks', label: 'Tasks' },
];

function NavItems({ onClick, drawer }) {
  const { pathname } = useLocation();
  const { due } = useApp();
  return NAV.map((n) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      onClick={onClick}
      className={({ isActive }) => (isActive || (n.match && pathname.startsWith(n.match)) ? 'active' : '')}
    >
      <span>{n.label}</span>
      {n.tag && <span className="tag">{n.tag}</span>}
      {n.to === '/dispatch' && due > 0 && <span className="tag" style={{ background: 'var(--amber)', color: 'var(--ink)' }}>{due}</span>}
      {drawer && <span aria-hidden="true">›</span>}
    </NavLink>
  ));
}

export default function Layout() {
  const { unread, state, dispatch, toast } = useApp();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); setOpen(false); }, [pathname]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-in">
          <button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}><IconMenu /></button>
          <Link to="/" className="brand" aria-label="Valmo LMDC home">
            <span className="brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5l7 15 7-15" /></svg>
            </span>
            <span className="brand-name"><b>Valmo LMDC</b><span>{HUB.id} · {HUB.name}</span></span>
          </Link>
          <nav className="nav" aria-label="Main"><NavItems /></nav>
          <div className="head-right">
            <span className="clock clock-date"><IconCal width={16} height={16} />{NOW.date}</span>
            <span className="clock"><span className="live-dot" />{NOW.time} IST</span>
            <Link to="/notifications" className="icon-btn" aria-label={`Notifications, ${unread} unread`}>
              <IconBell />
              {unread > 0 && <span className="badge-dot">{unread}</span>}
            </Link>
            <div className="user">
              <span className="avatar">RS</span>
              <span className="user-name">{HUB.lead}<span>{HUB.role}</span></span>
            </div>
          </div>
        </div>
      </header>

      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(false)} />
          <nav className="drawer" aria-label="Menu">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <b style={{ color: 'var(--brand)', fontSize: 16 }}>Valmo LMDC</b>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Close</button>
            </div>
            <NavItems drawer onClick={() => setOpen(false)} />
            <Link to="/notifications" onClick={() => setOpen(false)}>Notifications <span className="tag" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'var(--brand-pink)', color: '#fff' }}>{unread}</span></Link>
          </nav>
        </>
      )}

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer style={{ borderTop: '1px solid var(--line)', background: '#fff' }}>
        <div className="row wrap" style={{ maxWidth: 1880, margin: '0 auto', padding: '14px 28px', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
          <span>Valmo-SAVE prototype · Team 52 Saints, IIT Kharagpur · Meesho DICE Challenge 3.0 · simulated data for {NOW.date}, {NOW.time}</span>
          <button className="btn btn-ghost btn-sm"
            onClick={() => { dispatch({ type: 'reset' }); toast('Demo data reset to 13:45 state'); }}>Reset demo</button>
        </div>
      </footer>
    </div>
  );
}
