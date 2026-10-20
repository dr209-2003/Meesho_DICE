import { useEffect, useState } from 'react';

const mk = (d) => (p) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{d}</svg>
);
export const I = {
  save: mk(<><path d="M4 12a8 8 0 0114-5.3L20 9" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 01-14 5.3L4 15" /><path d="M4 20v-5h5" /></>),
  home: mk(<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>),
  chart: mk(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  box: mk(<><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7" /><path d="M12 11v10" /></>),
  cart: mk(<><path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.5L21 8H6" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></>),
  alert: mk(<><path d="M12 3l9.5 17h-19L12 3z" /><path d="M12 10v4M12 17v.5" /></>),
  report: mk(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>),
  gear: mk(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.2V21a2 2 0 11-4 0v-.1A1.6 1.6 0 007.4 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 003.4 14H3a2 2 0 110-4h.1A1.6 1.6 0 004.6 7.4l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 0010 3.4V3a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1A1.6 1.6 0 0020.6 10H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" /></>),
  download: mk(<><path d="M12 4v11M7 10l5 5 5-5" /><path d="M4 20h16" /></>),
  cal: mk(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  pin: mk(<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>),
  menu: mk(<path d="M4 6h16M4 12h16M4 18h16" />),
  x: mk(<path d="M6 6l12 12M18 6L6 18" />),
  chev: mk(<path d="M9 6l6 6-6 6" />),
  truck: mk(<><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7" /><circle cx="6" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>),
  wallet: mk(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></>),
  rupee: mk(<><path d="M7 4h11M7 9h11M7 4c5 0 7 2 7 5s-3 5-7 5l8 7" /></>),
  bag: mk(<><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></>),
  check: mk(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  search: mk(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>),
  ext: mk(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></>),
};

export function Card({ title, sub, right, children, className = '', ...rest }) {
  return (
    <section className={'card ' + className} {...rest}>
      {(title || right) && (
        <div className="card-h">
          <div><h2>{title}</h2>{sub && <div className="sub">{sub}</div>}</div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Delta({ v, invert, label, pts }) {
  if (v == null || !Number.isFinite(v)) return <span className="delta flat">— {label}</span>;
  const good = invert ? v < 0 : v > 0;
  const txt = pts ? `${Math.abs(v * 100).toFixed(0)} pts` : `${Math.abs(v * 100).toFixed(0)}%`;
  return <span className={'delta ' + (Math.abs(v) < 0.005 ? 'flat' : good ? 'up' : 'down')}>{v > 0 ? '↑' : v < 0 ? '↓' : '→'} {txt} <span className="muted">{label}</span></span>;
}

export function Drawer({ open, title, sub, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-h">
          <div><h2>{title}</h2>{sub && <div className="sub">{sub}</div>}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.x /></button>
        </div>
        <div className="drawer-b">{children}</div>
      </aside>
    </>
  );
}

export function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-h"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><I.x /></button></div>
        {children}
      </div>
    </>
  );
}

/** Sortable table header state */
export function useSort(initial, dir = 'desc') {
  const [s, setS] = useState({ key: initial, dir });
  const toggle = (key) => setS((x) => ({ key, dir: x.key === key && x.dir === 'desc' ? 'asc' : 'desc' }));
  const sorter = (get) => (a, b) => {
    const va = get(a, s.key), vb = get(b, s.key);
    const r = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return s.dir === 'desc' ? -r : r;
  };
  const Th = ({ k, children, num }) => (
    <th className={num ? 'num' : ''} aria-sort={s.key === k ? (s.dir === 'desc' ? 'descending' : 'ascending') : 'none'}>
      <button className="th-btn" onClick={() => toggle(k)}>{children}<span className="arr">{s.key === k ? (s.dir === 'desc' ? '▾' : '▴') : '↕'}</span></button>
    </th>
  );
  return { sorter, Th, s };
}

export const Badge = ({ c = 'grey', children }) => <span className={'badge b-' + c}>{children}</span>;

export function downloadCSV(name, rows) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
