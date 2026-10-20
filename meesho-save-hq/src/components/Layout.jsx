import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LMDCS, PERIODS, REGIONS, isoOf, DAYS } from '../data/model';
import { fileSlug, fullReport } from '../data/reports';
import { useApp, useFilters } from '../state';
import { I, downloadCSV } from './ui';

const NAV = [
  ['/', 'VALMO-SAVE', 'save', true],
  ['/overview', 'Overview', 'home'],
  ['/lmdcs', 'LMDC Performance', 'chart'],
  ['/inventory', 'Inventory', 'box'],
  ['/orders', 'Orders', 'cart'],
  ['/alerts', 'Issues & Alerts', 'alert'],
  ['/reports', 'Reports', 'report'],
  ['/settings', 'Settings', 'gear'],
];
const TITLES = {
  '/': ['LMDC Performance', 'Track RTO, resale, inventory and delivery performance across locations'],
  '/overview': ['Network overview', 'Valmo-SAVE across every region and LMDC'],
  '/lmdcs': ['LMDC Performance', 'Compare LMDCs on resale rate, prepaid conversion and cost saved'],
  '/inventory': ['Inventory health', 'Units held at LMDCs right now, by age and shelf capacity'],
  '/orders': ['Meesho Quick orders', 'Orders fulfilled from SAVE inventory'],
  '/alerts': ['Issues & alerts', 'Operational gaps that need action'],
  '/reports': ['Reports', 'Download data for the selected location and period'],
  '/settings': ['Settings', 'Alert thresholds'],
};

function Picker({ label, icon, value, children, wide }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [open]);
  const Ic = I[icon];
  return (
    <div className="fld" ref={ref}>
      <span>{label}</span>
      <button className={'sel' + (open ? ' open' : '')} onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${value}`}>
        <Ic width={16} height={16} /><b>{value}</b><I.chev width={16} height={16} className="caret" />
      </button>
      {open && <div className={'pop' + (wide ? ' wide' : '')} role="listbox" aria-label={label}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

function Filters() {
  const { loc, period, set } = useFilters();
  const opt = (on, text, click, sub) => (
    <button key={text} role="option" aria-selected={on} className={'opt' + (on ? ' on' : '')} onClick={click}>
      <span>{text}{sub && <small>{sub}</small>}</span>{on && <I.check width={16} height={16} />}
    </button>
  );
  return (
    <div className="filters">
      <Picker label="Select LMDC" icon="pin" value={loc.label} wide>
        {(close) => (
          <div className="pop-grid">
            <div className="pop-col">{opt(loc.id === 'all', 'All India', () => { set({ loc: 'all' }); close(); }, `${LMDCS.length} LMDCs`)}</div>
            {REGIONS.map((r) => (
              <div key={r.id} className="pop-col">
                <div className="pop-h">{r.name}</div>
                {opt(loc.id === 'r:' + r.id, `All ${r.name}`, () => { set({ loc: 'r:' + r.id }); close(); })}
                {LMDCS.filter((l) => l.region === r.id).map((l) => opt(loc.id === l.id, l.name, () => { set({ loc: l.id }); close(); }, l.code))}
              </div>
            ))}
          </div>
        )}
      </Picker>
      <Picker label="Period" icon="cal" value={period.label.replace(' (month to date)', ' (MTD)')}>
        {(close) => (
          <>
            {PERIODS.map((p) => opt(period.id === p.id, p.label, () => { set({ period: p.id, from: null, to: null }); close(); }))}
            <div className="pop-h" style={{ marginTop: 6 }}>Custom range</div>
            <div className="pop-custom">
              <input type="date" min={isoOf(0)} max={isoOf(DAYS - 1)} value={isoOf(period.range[0])} onChange={(e) => e.target.value && set({ period: 'custom', from: e.target.value, to: isoOf(period.range[1]) })} aria-label="From date" />
              <span>to</span>
              <input type="date" min={isoOf(0)} max={isoOf(DAYS - 1)} value={isoOf(period.range[1])} onChange={(e) => e.target.value && set({ period: 'custom', from: isoOf(period.range[0]), to: e.target.value })} aria-label="To date" />
            </div>
          </>
        )}
      </Picker>
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const { openCount, alerts, toast } = useApp();
  const { loc, period, qs } = useFilters();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  const [title, sub] = TITLES[pathname] || ['Page not found', ''];
  const download = () => { downloadCSV(fileSlug(loc, period) + '.csv', fullReport(loc, period, alerts)); toast(`Report downloaded · ${loc.short}, ${period.label}`); };

  return (
    <div className="shell">
      <aside className={'side' + (open ? ' open' : '')} aria-label="Main navigation">
        <div className="logo">meesho</div>
        <nav>
          {NAV.map(([to, label, icon, end]) => {
            const Ic = I[icon];
            return (
              <NavLink key={to} to={to + qs} end={end} className={({ isActive }) => (isActive ? 'on' : '')}>
                <Ic /><span>{label}</span>{to === '/alerts' && openCount > 0 && <em>{openCount}</em>}
              </NavLink>
            );
          })}
        </nav>
        <div className="side-foot">
          <b>Valmo-SAVE pilot</b>
          Hold failed deliveries at the LMDC up to 21 days and resell within 70 km through Meesho Quick.
          <span className="tag">Illustrative data</span>
        </div>
      </aside>
      {open && <div className="scrim side-scrim" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="top">
          <button className="icon-btn burger" onClick={() => setOpen(true)} aria-label="Open menu"><I.menu /></button>
          <div className="ttl"><h1>{title}</h1><p>{sub}</p></div>
          <Filters />
          <button className="btn btn-out" onClick={download}><I.download width={18} height={18} />Download Report</button>
        </header>
        <main className="content"><Outlet /></main>
        <footer className="foot">Valmo-SAVE monitoring prototype · Team 52 Saints, IIT Kharagpur · Meesho DICE Challenge 3.0 · Illustrative data generated for the pilot, updated to 20 Oct 2026</footer>
      </div>
    </div>
  );
}
