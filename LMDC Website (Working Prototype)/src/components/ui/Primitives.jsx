import { Link } from 'react-router-dom';

export function Card({ title, sub, right, children, className = '', style, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={'card ' + className} style={style} {...rest}>
      {(title || right) && (
        <div className="card-head">
          <div style={{ minWidth: 0 }}>
            {title && <h2 className="card-title">{title}</h2>}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </Tag>
  );
}

export function PageHead({ crumbs, title, sub, children }) {
  return (
    <div className="page-head">
      <div style={{ minWidth: 0 }}>
        {crumbs && (
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: 'inline-flex', gap: 6 }}>
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{c.label}</span>}
                {i < crumbs.length - 1 && <span>›</span>}
              </span>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}

export const Pill = ({ bg, fg, children, style }) => (
  <span className="pill" style={{ background: bg, color: fg, ...style }}>{children}</span>
);

export const Bar = ({ value, color, height = 8, style }) => (
  <div className="bar" style={{ height, ...style }}>
    <i style={{ width: Math.max(0, Math.min(100, value * 100)) + '%', background: color }} />
  </div>
);

export function Sparkline({ values, color, height = 38 }) {
  const w = 120;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const rng = hi - lo || 1;
  const pts = values.map((v, i) => [2 + (i * (w - 4)) / (values.length - 1), height - 4 - ((v - lo) / rng) * (height - 10)]);
  const p = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="kpi-spark" viewBox={`0 0 ${w} ${height}`} aria-hidden="true">
      <polygon points={`2,${height} ${p} ${w - 2},${height}`} style={{ fill: color }} fillOpacity="0.14" />
      <polyline points={p} fill="none" style={{ stroke: color }} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3.5" fill="#fff" style={{ stroke: color }} strokeWidth="2" />
    </svg>
  );
}

export function Ring({ value, color, size = 56, stroke = 7, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ flex: 'none' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: color }} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize="11.5" fontWeight="700" style={{ fill: color }}>{label ?? Math.round(value * 100) + '%'}</text>
    </svg>
  );
}

export function Kpi({ label, value, icon, accent, tint, sub, series, extra, to }) {
  const body = (
    <>
      <div className="kpi-top">
        <span className="kpi-ico">{icon}</span>
        <span className="lbl">{label}</span>
      </div>
      <div className="kpi-mid">
        <span className="kpi-val">{value}</span>
        {series && <Sparkline values={series} color={accent} />}
      </div>
      {extra}
      <span className="sub">{sub}</span>
    </>
  );
  const style = { '--accent': accent, '--tint': tint, color: 'inherit', textDecoration: 'none' };
  return to ? <Link to={to} className="card kpi" style={style}>{body}</Link> : <div className="card kpi" style={style}>{body}</div>;
}

export function Tile({ label, value, sub, tint, deep, visual, to }) {
  const inner = (
    <>
      <div className="tile-body" style={{ color: deep }}>
        <span className="tile-lbl">{label}</span>
        <b className="tile-val">{value}</b>
        <span className="tile-sub ell">{sub}</span>
      </div>
      {visual}
    </>
  );
  const style = { background: tint, color: deep };
  return to ? <Link to={to} className="tile" style={{ ...style, textDecoration: 'none' }}>{inner}</Link> : <div className="tile" style={style}>{inner}</div>;
}

export const Legend = ({ items }) => (
  <div className="legend">
    {items.map(([c, t, dashed]) => (
      <span key={t}>
        {dashed ? <span style={{ width: 16, borderTop: `2px dashed ${c}` }} /> : <span className="dot" style={{ background: c }} />}
        {t}
      </span>
    ))}
  </div>
);
