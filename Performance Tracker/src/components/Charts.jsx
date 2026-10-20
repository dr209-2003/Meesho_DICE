import { useState } from 'react';
import { fmt, pct } from '../data/model';

/** Horizontal funnel bars; each stage is a button. */
export function Funnel({ stages, onPick }) {
  const max = stages[0].value || 1;
  return (
    <div className="funnel">
      {stages.map((s, i) => (
        <button key={s.key} className="fun-row" onClick={() => onPick(s)} aria-label={`${s.label}: ${fmt(s.value)}. Show breakdown`}>
          <span className="fun-l">{s.label}</span>
          <span className="fun-track"><span className="fun-bar" style={{ width: `${Math.max(4, (s.value / max) * 100)}%`, background: s.color }} /></span>
          <span className="fun-v"><b>{fmt(s.value)}</b><span className="muted">({pct(s.value / max)})</span></span>
          {i > 0 && <span className="sr-only">{pct(s.value / stages[i - 1].value)} of previous stage</span>}
        </button>
      ))}
    </div>
  );
}

/** Line chart for sell-through with hover tooltips. */
export function Line({ points, color = '#e8396b', height = 300 }) {
  const [hover, setHover] = useState(null);
  const W = 520, H = height, L = 52, R = 20, T = 26, B = 36;
  const n = points.length;
  const x = (i) => (n === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (1 - v) * (H - T - B);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.v)}`).join(' ');
  const area = `${d} L${x(n - 1)},${H - B} L${x(0)},${H - B} Z`;
  const last = points[n - 1];
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={`Sell-through ${points.map((p) => `${p.label} ${pct(p.v)}`).join(', ')}`}>
        <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}><line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#eceaf2" /><text x={L - 8} y={y(g) + 4} textAnchor="end" className="ax">{g * 100}%</text></g>
        ))}
        <path d={area} fill="url(#lg)" />
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.v)} r={hover === i ? 6 : 4} fill="#fff" stroke={color} strokeWidth="2.5" />
            {(n <= 8 || i % Math.ceil(n / 7) === 0) && <text x={x(i)} y={H - 9} textAnchor="middle" className="ax">{p.label}</text>}
            <rect x={x(i) - (W - L - R) / Math.max(1, n - 1) / 2} y={T} width={(W - L - R) / Math.max(1, n - 1)} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          </g>
        ))}
        {last && <g transform={`translate(${Math.min(x(n - 1), W - R - 28)},${y(last.v) - 20})`}><rect x="-28" y="-16" width="56" height="27" rx="7" fill={color} /><text x="0" y="3" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">{pct(last.v)}</text></g>}
      </svg>
      {hover != null && (
        <div className="tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(points[hover].v) / H) * 100}%` }}>
          <b>{points[hover].label}</b>{pct(points[hover].v)} sold<br /><span className="muted">{fmt(points[hover].sold)} of {fmt(points[hover].elig)} eligible</span>
        </div>
      )}
    </div>
  );
}

export function Donut({ parts, center, sub, size = 150, onPick }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = 54, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox="0 0 150 150" width={size} height={size} role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
      <circle cx="75" cy="75" r={r} fill="none" stroke="#f1eff5" strokeWidth="20" />
      {parts.map((p, i) => {
        const len = (p.value / total) * c;
        const el = <circle key={i} cx="75" cy="75" r={r} fill="none" stroke={p.color} strokeWidth="20" strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`} strokeDashoffset={-acc} transform="rotate(-90 75 75)" style={{ cursor: onPick ? 'pointer' : 'default' }} onClick={() => onPick && onPick(i)} />;
        acc += len;
        return el;
      })}
      <text x="75" y="73" textAnchor="middle" fontSize="22" fontWeight="700" fill="#2b1e33">{center}</text>
      <text x="75" y="92" textAnchor="middle" fontSize="11" fill="#8b8ba3">{sub}</text>
    </svg>
  );
}

export function StackBar({ parts, height = 10 }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="stack" style={{ height }}>
      {parts.map((p, i) => <span key={i} title={`${p.label}: ${fmt(p.value)}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
    </div>
  );
}

export const Bar = ({ v, color = '#9f2089' }) => (
  <span className="mini"><span style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%`, background: color }} /></span>
);

/** Vertical bars (e.g. sold by region). */
export function Columns({ data, color = '#9f2089', onPick, fmtV = fmt }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="cols">
      {data.map((d) => (
        <button key={d.key} className="col" onClick={() => onPick && onPick(d)} aria-label={`${d.label}: ${fmtV(d.value)}`}>
          <span className="col-v">{fmtV(d.value)}</span>
          <span className="col-t"><span style={{ height: `${(d.value / max) * 100}%`, background: d.color || color }} /></span>
          <span className="col-l">{d.label}</span>
        </button>
      ))}
    </div>
  );
}
