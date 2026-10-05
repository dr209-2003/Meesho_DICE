import { POLICY } from '../../lib/engine';
import { SHUTTLES, CUTOFF_MIN } from '../../data/dispatch';
import { NOW, toMin } from '../../lib/format';

const halo = { paintOrder: 'stroke', stroke: '#fff', strokeWidth: 4 };

/** Bar version of the resale curve: teal where holding already pays, amber where not yet */
export function CurveBars({ d, height = 118 }) {
  const req = (t) => d.req[t];
  const pts = d.F.slice(1).map((_, t) => `${(((t + 0.5) / POLICY.capDays) * 210).toFixed(1)},${(height - Math.min(1, req(t + 1)) * height).toFixed(1)}`).join(' ');
  return (
    <div>
      <div style={{ position: 'relative', height, display: 'flex', alignItems: 'flex-end', gap: 2, borderBottom: '1px solid var(--line-2)' }}>
        {d.F.slice(1).map((v, t) => (
          <div key={t} title={`Day ${t + 1}: ${Math.round(v * 100)}%`}
            style={{ flex: '1 1 0', borderRadius: '3px 3px 0 0', height: Math.max(2, Math.round(v * height)), background: v >= req(t + 1) ? 'var(--teal)' : 'var(--amber)', opacity: t + 1 > d.Ts && d.hold ? 0.35 : 1 }} />
        ))}
        <svg viewBox={`0 0 210 ${height}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
          <polyline points={pts} fill="none" stroke="#E8396B" strokeWidth="2.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>
        <span>day 1</span><span>7</span><span>14</span><span>21</span>
      </div>
    </div>
  );
}

/** Area chart of P(resold by day t) with the break-even requirement */
export function ResaleCurve({ d, maxDays }) {
  const CAP = POLICY.capDays;
  const W = 700, H = 236, x0 = 40, x1 = 684, y0 = 14, y1 = 206;
  const X = (t) => x0 + (t / CAP) * (x1 - x0);
  const Y = (p) => y1 - p * (y1 - y0);
  const line = d.F.map((p, t) => `${X(t).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
  const area = `${X(0)},${Y(0)} ${line} ${X(CAP)},${Y(0)}`;
  const rq = d.req.slice(1).map((p, i) => `${X(i + 1).toFixed(1)},${Y(p).toFixed(1)}`).join(' ');
  const T = maxDays;
  const med = d.median;
  const tagX = X(T) > x0 + 360 ? X(T) - 186 : X(T) + 12;
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chance a retained unit has resold by day held">
      <defs>
        <linearGradient id="rc-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9F2089" stopOpacity=".3" /><stop offset="1" stopColor="#F43397" stopOpacity=".03" /></linearGradient>
        <linearGradient id="rc-line" x1="0" x2="1"><stop offset="0" stopColor="#F43397" /><stop offset="1" stopColor="#9F2089" /></linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <g key={p}>
          <line x1={x0} x2={x1} y1={Y(p)} y2={Y(p)} stroke="#EFEFF5" />
          <text x={x0 - 8} y={Y(p) + 4} textAnchor="end" fontSize="10.5" fill="#8B8BA3">{p * 100}%</text>
        </g>
      ))}
      {[0, 3, 7, 10, 14, 17, 21].map((t) => <text key={t} x={X(t)} y={y1 + 18} textAnchor="middle" fontSize="10.5" fill="#8B8BA3">{t === 0 ? 'day 0' : t}</text>)}
      {d.breakEven > 0 && <rect x={X(0)} y={Y(1)} width={X(d.breakEven) - X(0)} height={Y(0) - Y(1)} fill="#FEF3DC" opacity=".8" />}
      {T < CAP && <rect x={X(T)} y={Y(1)} width={X(CAP) - X(T)} height={Y(0) - Y(1)} fill="#F4F4F8" opacity=".9" />}
      <polygon points={area} fill="url(#rc-area)" />
      <polyline points={rq} fill="none" stroke="#E8396B" strokeWidth="2.2" strokeDasharray="6 4" />
      <polyline points={line} fill="none" stroke="url(#rc-line)" strokeWidth="3.5" strokeLinejoin="round" />
      {med > 0 && med <= CAP && (
        <g>
          <line x1={X(med)} x2={X(med)} y1={Y(d.F[med])} y2={y1} stroke="#7B3FE4" strokeDasharray="3 3" />
          <circle cx={X(med)} cy={Y(d.F[med])} r="6" fill="#fff" stroke="#7B3FE4" strokeWidth="3" />
          <rect x={X(med) + 10} y={Y(d.F[med]) - 30} width="122" height="22" rx="7" fill="#7B3FE4" />
          <text x={X(med) + 71} y={Y(d.F[med]) - 15} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#fff">50% sold by day {med}</text>
        </g>
      )}
      <line x1={X(T)} x2={X(T)} y1={Y(d.F[T])} y2={y1} stroke="#0E9F8E" strokeDasharray="3 3" />
      <circle cx={X(T)} cy={Y(d.F[T])} r="6" fill="#fff" stroke="#0E9F8E" strokeWidth="3" />
      <rect x={tagX} y={Y(d.F[T]) - 36} width="176" height="22" rx="7" fill="#0E9F8E" />
      <text x={tagX + 88} y={Y(d.F[T]) - 21} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#fff">
        {Math.round(d.F[T] * 100)}% by day {T} · cost ₹{Math.round(d.C[T])}
      </text>
      <text x={X(14)} y={Y(d.req[14]) - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill="#E8396B" style={halo}>
        chance needed for holding to pay ≈ {Math.round(d.req[1] * 100)}–{Math.round(d.req[CAP] * 100)}%
      </text>
    </svg>
  );
}

/** Concentric 10/25/50/70 km rings with buyer zones around the hub */
export function RingMap({ zones, highlight }) {
  const cx = 132, cy = 132;
  const R = (km) => 14 + (Math.min(km, 70) / 70) * 108;
  const rings = [[70, '#FAF6FB'], [50, '#F6EEF6'], [25, '#F1E3F0'], [10, '#EAD5E8']];
  const colors = ['#E8396B', '#7B3FE4', '#3D6CE0', '#F5A623', '#0E9F8E', '#2BA6DE'];
  const pts = zones.map(([name, km, share, ang], i) => {
    const a = (ang * Math.PI) / 180;
    return { name, km, share, x: cx + R(km) * Math.cos(a), y: cy + R(km) * Math.sin(a), c: colors[i % colors.length] };
  });
  const hl = highlight && pts.find((p) => p.name === highlight.zone);
  return (
    <svg viewBox="0 0 264 264" style={{ width: 264, maxWidth: '100%', flex: 'none' }} role="img" aria-label="Buyers of this SKU within 10, 25, 50 and 70 km">
      {rings.map(([km, fill]) => (
        <g key={km}>
          <circle cx={cx} cy={cy} r={R(km)} fill={fill} stroke="#D7B5D2" strokeDasharray={km === 70 ? '0' : '4 4'} />
          <text x={cx + 4} y={cy - R(km) + 12} fontSize="9.5" fontWeight="600" fill="#8B8BA3">{km} km</text>
        </g>
      ))}
      {pts.map((p) => (
        <circle key={p.name} cx={p.x} cy={p.y} r={4 + (p.share * 100) / 2.4} fill={p.c} fillOpacity=".88" stroke="#fff" strokeWidth="2"><title>{`${p.name}: ${p.km} km · ${Math.round(p.share * 100)}%`}</title></circle>
      ))}
      {hl && (
        <g>
          <line x1={cx} y1={cy} x2={hl.x} y2={hl.y} stroke="#570A57" strokeWidth="2" strokeDasharray="5 4" />
          <circle cx={hl.x} cy={hl.y} r="15" fill="none" stroke="#570A57" strokeWidth="2" />
          <text x={hl.x + 4} y={hl.y - 22} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#570A57" style={halo}>{highlight.label}</text>
        </g>
      )}
      <rect x={cx - 8} y={cy - 8} width="16" height="16" rx="3" fill="#E86C2C" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

/** LMDC ⇄ LMSC shuttle timeline with the current time and the next cut-off */
export function ShuttleStrip() {
  const T0 = 7 * 60 + 50, T1 = 19 * 60 + 15;
  const xp = (m) => ((m - T0) / (T1 - T0)) * 100;
  const nowX = xp(NOW.minutes);
  const next = SHUTTLES.find((s) => toMin(s.time) > NOW.minutes);
  const cutX = next ? xp(toMin(next.time) - CUTOFF_MIN) : nowX;
  return (
    <div style={{ position: 'relative', height: 78 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 27, height: 4, borderRadius: 2, background: '#EEEEF4' }} />
      <div style={{ position: 'absolute', left: 0, width: nowX + '%', top: 27, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #F43397, #9F2089)' }} />
      <div style={{ position: 'absolute', left: nowX + '%', width: cutX - nowX + '%', top: 23, height: 12, borderRadius: 3, background: 'repeating-linear-gradient(45deg, #FDE6EE 0 4px, #F7C3D3 4px 8px)' }} />
      {SHUTTLES.map((s) => {
        const m = toMin(s.time);
        const st = m <= NOW.minutes ? 'gone' : s === next ? 'next' : 'later';
        const dot = st === 'gone' ? { background: '#570A57', border: '2px solid #570A57', color: '#fff' }
          : st === 'next' ? { background: '#F5A623', border: '2px solid #fff', boxShadow: '0 0 0 3px #F5A623', color: '#353543' }
            : { background: '#fff', border: '2px solid #CFCFDF', color: '#A3A3B8' };
        return (
          <div key={s.id} title={`${s.time} ${s.vehicle}${s.units ? ` · ${s.units} units` : ''}`}
            style={{ position: 'absolute', left: xp(m) + '%', top: 0, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 60 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: st === 'later' ? '#8B8BA3' : st === 'next' ? '#8A5A00' : '#570A57' }}>{s.time}</span>
            <span style={{ width: 20, height: 20, borderRadius: 10, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, ...dot }}>{st === 'gone' ? '✓' : st === 'next' ? '→' : ''}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: st === 'later' ? '#A3A3B8' : '#4F4F63' }}>{s.vehicle}</span>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: nowX + '%', top: 19, height: 43, borderLeft: '2px dashed #E8396B' }} />
      <span style={{ position: 'absolute', left: nowX + '%', top: 62, transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: '#fff', background: '#E8396B', padding: '1px 6px', borderRadius: 5, whiteSpace: 'nowrap' }}>now {NOW.time}</span>
    </div>
  );
}
