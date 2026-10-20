import { Link } from 'react-router-dom';
import { CATEGORIES, DAYS, REASONS, SHELF, SHELF_AGES, TODAY, ZONES, failed, retained, successRate } from '../../data/ops';
import { fmt } from '../../lib/format';

const HEX = { blue: '#3D6CE0', sky: '#2BA6DE', grey: '#A3A3B8', green: '#038D63', rose: '#E8396B', orange: '#E86C2C', teal: '#0E9F8E', amber: '#F5A623' };
const halo = { paintOrder: 'stroke', stroke: '#fff', strokeWidth: 4 };

/* ------------------------------------------------------------ Sankey */
export function Sankey() {
  const W = 383, H = 268, s = 196 / TODAY.received, nw = 11;
  const [x0, x1, x2, x3] = [0, 104, 208, 280];
  const top = 40;
  const rec = [x0, top, top + TODAY.received * s];
  const ofd = [x1, top, top + TODAY.outForDelivery * s];
  const held = [x1, ofd[2] + 8, ofd[2] + 8 + TODAY.notDispatched * s];
  const del = [x2, top, top + TODAY.delivered * s];
  const fail = [x2, del[2] + 14, del[2] + 14 + TODAY.failed * s];
  const rto = [x3, fail[1] - 6, fail[1] - 6 + TODAY.rto * s];
  const ret = [x3, rto[2] + 8, rto[2] + 8 + TODAY.retained * s];
  const band = (id, sx, sy0, sy1, tx, ty0, ty1, c1, c2) => {
    const xm = (sx + tx) / 2;
    return {
      id, c1, c2,
      d: `M${sx},${sy0} C${xm},${sy0} ${xm},${ty0} ${tx},${ty0} L${tx},${ty1} C${xm},${ty1} ${xm},${sy1} ${sx},${sy1} Z`,
    };
  };
  const links = [
    band('k1', x0 + nw, rec[1], rec[1] + TODAY.outForDelivery * s, x1, ofd[1], ofd[2], HEX.blue, HEX.sky),
    band('k2', x0 + nw, rec[1] + TODAY.outForDelivery * s, rec[2], x1, held[1], held[2], HEX.blue, HEX.grey),
    band('k3', x1 + nw, ofd[1], ofd[1] + TODAY.delivered * s, x2, del[1], del[2], HEX.sky, HEX.green),
    band('k4', x1 + nw, ofd[1] + TODAY.delivered * s, ofd[2], x2, fail[1], fail[2], HEX.sky, HEX.rose),
    band('k5', x2 + nw, fail[1], fail[1] + TODAY.rto * s, x3, rto[1], rto[2], HEX.rose, HEX.orange),
    band('k6', x2 + nw, fail[1] + TODAY.rto * s, fail[2], x3, ret[1], ret[2], HEX.rose, HEX.teal),
  ];
  const nodes = [[rec, HEX.blue], [ofd, HEX.sky], [held, HEX.grey], [del, HEX.green], [fail, HEX.rose], [rto, HEX.orange], [ret, HEX.teal]];
  const label = (x, y, name, val, color, big = 15) => (
    <g key={name}>
      <text x={x} y={y} fontSize="11" fontWeight="600" fill="#8B8BA3" style={halo}>{name}</text>
      <text x={x} y={y + big + 2} fontSize={big} fontWeight="700" fill={color} style={halo}>{val}</text>
    </g>
  );
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Flow of today's parcels from hub to outcome">
      <defs>
        {links.map((l) => (
          <linearGradient key={l.id} id={'sk-' + l.id} x1="0" x2="1">
            <stop offset="0" stopColor={l.c1} stopOpacity=".45" /><stop offset="1" stopColor={l.c2} stopOpacity=".45" />
          </linearGradient>
        ))}
      </defs>
      {links.map((l) => <path key={l.id} d={l.d} fill={`url(#sk-${l.id})`} />)}
      {nodes.map(([n, c], i) => <rect key={i} x={n[0]} y={n[1]} width={nw} height={Math.max(2, n[2] - n[1])} rx="3" fill={c} />)}
      {label(0, 14, 'Received', fmt(TODAY.received), HEX.blue)}
      {label(x1, 14, 'Out for delivery', fmt(TODAY.outForDelivery), '#1F7FC0')}
      {label(x2 + nw + 8, 112, 'Delivered', `${fmt(TODAY.delivered)} · ${((TODAY.delivered / TODAY.outForDelivery) * 100).toFixed(1)}%`, HEX.green, 17)}
      {label(x2 + nw + 8, del[2] - 16, 'Failed', `${TODAY.failed} · ${((TODAY.failed / TODAY.outForDelivery) * 100).toFixed(1)}%`, HEX.rose)}
      <text x={x3 + nw + 6} y={rto[1] + 13} fontSize="12.5" fontWeight="700" fill={HEX.orange}>RTO {TODAY.rto}</text>
      <text x={x3 + nw + 6} y={ret[1] + 10} fontSize="12.5" fontWeight="700" fill={HEX.teal}>Retained {TODAY.retained}</text>
      <text x={x1 + nw + 6} y={held[2] + 12} fontSize="11.5" fontWeight="600" fill="#8B8BA3">{TODAY.notDispatched} held · next run</text>
    </svg>
  );
}

/* ------------------------------------------------------------ 14-day combo */
export function TrendCombo() {
  const W = 383, H = 250, px0 = 34, px1 = 345, py0 = 10, py1 = 222, ymax = 700;
  const slot = (px1 - px0) / 14, bw = 14;
  const Y = (v) => py1 - (v / ymax) * (py1 - py0);
  const YS = (p) => py1 - ((p * 100 - 82) / 9) * (py1 - py0);
  const pts = successRate.map((p, i) => [px0 + slot * (i + 0.5), YS(p)]);
  const [lx, ly] = pts[13];
  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Failed deliveries over the last 14 days with success rate">
      {[0, 200, 400, 600].map((v) => (
        <g key={v}>
          <line x1={px0} x2={px1} y1={Y(v)} y2={Y(v)} stroke="#EFEFF5" />
          <text x={px0 - 6} y={Y(v) + 4} textAnchor="end" fontSize="10.5" fill="#8B8BA3">{v}</text>
        </g>
      ))}
      {[84, 86, 88, 90].map((v) => <text key={v} x={px1 + 6} y={YS(v / 100) + 4} fontSize="10.5" fill={HEX.green}>{v}%</text>)}
      {failed.map((f, i) => {
        const cx = px0 + slot * (i + 0.5);
        const op = i === 13 ? 1 : 0.8;
        return (
          <g key={i}>
            <title>{`${DAYS[i]}: ${f} failed · ${retained[i]} retained · ${(successRate[i] * 100).toFixed(1)}% success`}</title>
            <rect x={cx - bw / 2} y={Y(f)} width={bw} height={Y(retained[i]) - Y(f)} rx="3" fill={HEX.orange} fillOpacity={op} />
            <rect x={cx - bw / 2} y={Y(retained[i])} width={bw} height={py1 - Y(retained[i])} fill={HEX.teal} fillOpacity={op} />
            {(i % 2 === 1 || i === 13) && (
              <text x={cx} y={py1 + 15} textAnchor="middle" fontSize="10.5" fill={i === 13 ? '#353543' : '#8B8BA3'} fontWeight={i === 13 ? 700 : 400}>{DAYS[i].slice(0, 2)}</text>
            )}
          </g>
        );
      })}
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={HEX.green} strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 13 ? 4.5 : 3} fill="#fff" stroke={HEX.green} strokeWidth="2" />)}
      <rect x={lx - 40} y={ly - 30} width="54" height="20" rx="6" fill={HEX.green} />
      <text x={lx - 13} y={ly - 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{(successRate[13] * 100).toFixed(1)}%</text>
      <text x={(px0 + px1) / 2} y={H - 2} textAnchor="middle" fontSize="10.5" fill="#8B8BA3">Sep → Oct 2026</text>
    </svg>
  );
}

/* ------------------------------------------------------------ donut */
export function ReasonsDonut() {
  const total = REASONS.reduce((a, r) => a + r.n, 0);
  const cx = 92, cy = 92, ro = 88, ri = 56;
  let a = -Math.PI / 2;
  const segs = REASONS.map((r) => {
    const sw = (r.n / total) * 2 * Math.PI;
    const a0 = a + 0.012, a1 = a + sw - 0.012;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const P = (rad, ang) => `${(cx + rad * Math.cos(ang)).toFixed(2)},${(cy + rad * Math.sin(ang)).toFixed(2)}`;
    const d = `M${P(ro, a0)} A${ro},${ro} 0 ${large} 1 ${P(ro, a1)} L${P(ri, a1)} A${ri},${ri} 0 ${large} 0 ${P(ri, a0)} Z`;
    const am = a + sw / 2;
    a += sw;
    return { ...r, d, lx: cx + ((ro + ri) / 2) * Math.cos(am), ly: cy + ((ro + ri) / 2) * Math.sin(am) + 4 };
  });
  return (
    <div className="row" style={{ gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 184 184" style={{ width: 184, maxWidth: '45%', flex: 'none' }} role="img" aria-label="Failure reasons">
        {segs.map((s) => (
          <g key={s.name}>
            <title>{`${s.name}: ${s.n}`}</title>
            <path d={s.d} style={{ fill: s.color }} />
            {s.n / total > 0.08 && <text x={s.lx} y={s.ly} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{Math.round((s.n / total) * 100)}%</text>}
          </g>
        ))}
        <text x="92" y="90" textAnchor="middle" fontSize="28" fontWeight="700" fill="#353543">{total}</text>
        <text x="92" y="108" textAnchor="middle" fontSize="11.5" fill="#8B8BA3">failed today</text>
      </svg>
      <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 150 }}>
        {REASONS.map((r) => (
          <div key={r.name} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="row" style={{ gap: 7, fontSize: 12 }}>
              <span className="dot" style={{ background: r.color }} />
              <span className="ell grow" style={{ fontWeight: 500 }}>{r.name}</span>
              <b>{r.n}</b>
            </div>
            <div className="bar" style={{ height: 5 }}><i style={{ width: (r.n / REASONS[0].n) * 100 + '%', background: r.color }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ zones */
export function ZoneBars() {
  const max = Math.max(...ZONES.map((z) => z.failed));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {ZONES.map((z) => (
        <div key={z.name} style={{ display: 'grid', gridTemplateColumns: '96px 1fr 40px', alignItems: 'center', gap: 10 }}>
          <span className="row" style={{ gap: 7, fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ width: 8, height: 26, borderRadius: 4, background: z.color, flex: 'none' }} />{z.name}
          </span>
          <div style={{ display: 'flex', height: 26, width: (z.failed / max) * 100 + '%', borderRadius: 7, overflow: 'hidden', fontSize: 11.5, fontWeight: 700, color: '#fff' }}
            title={`${z.name}: ${z.rto} RTO · ${z.retained} retained`}>
            <div style={{ width: (z.rto / z.failed) * 100 + '%', background: 'var(--orange)', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>{z.rto}</div>
            <div style={{ flex: 1, background: 'var(--teal)', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>{z.retained}</div>
          </div>
          <b style={{ textAlign: 'right', fontSize: 14 }}>{z.failed}</b>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ gauge */
export function ShelfGauge({ size = 200 }) {
  const pctUsed = SHELF.used / SHELF.slots;
  const gx = 100, gy = 100, gr = 82;
  const arc = (p0, p1, r) => {
    const a0 = Math.PI * (1 - p0), a1 = Math.PI * (1 - p1);
    return `M${gx + r * Math.cos(a0)},${gy - r * Math.sin(a0)} A${r},${r} 0 0 1 ${gx + r * Math.cos(a1)},${gy - r * Math.sin(a1)}`;
  };
  const alertA = Math.PI * (1 - SHELF.alertAt);
  return (
    <svg viewBox="0 0 200 116" style={{ width: size, maxWidth: '100%', flex: 'none' }} role="img" aria-label={`Hold shelf ${Math.round(pctUsed * 100)}% full`}>
      <defs>
        <linearGradient id="gauge-g" x1="0" x2="1"><stop offset="0" stopColor={HEX.teal} /><stop offset=".6" stopColor={HEX.amber} /><stop offset="1" stopColor={HEX.rose} /></linearGradient>
      </defs>
      <path d={arc(0, 1, gr)} fill="none" stroke="#EFEFF5" strokeWidth="18" strokeLinecap="round" />
      <path d={arc(0, pctUsed, gr)} fill="none" stroke="url(#gauge-g)" strokeWidth="18" strokeLinecap="round" />
      <path d={arc(SHELF.alertAt - 0.002, SHELF.alertAt + 0.002, gr + 14)} fill="none" stroke="#B4325B" strokeWidth="3" />
      <text x={gx + (gr + 22) * Math.cos(alertA)} y={gy - (gr + 22) * Math.sin(alertA)} fontSize="9.5" fontWeight="700" fill="#B4325B" textAnchor="middle">90%</text>
      <text x="100" y="86" textAnchor="middle" fontSize="26" fontWeight="700" fill="#353543">{fmt(SHELF.used)}</text>
      <text x="100" y="104" textAnchor="middle" fontSize="11" fill="#8B8BA3">of {fmt(SHELF.slots)} slots · {Math.round(pctUsed * 100)}%</text>
    </svg>
  );
}

export function AgeBar() {
  const total = SHELF_AGES.reduce((a, b) => a + b.units, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', height: 24, borderRadius: 7, overflow: 'hidden', gap: 2 }}>
        {SHELF_AGES.map((a) => (
          <div key={a.label} title={`${a.label}: ${a.units}`} style={{ width: (a.units / total) * 100 + '%', background: a.color, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{a.units}</div>
        ))}
      </div>
      <div className="legend">{SHELF_AGES.map((a) => <span key={a.label}><span className="dot" style={{ background: a.color }} />{a.short}</span>)}</div>
    </div>
  );
}

/* ------------------------------------------------------------ treemap */
export function CategoryTreemap() {
  const total = CATEGORIES.reduce((a, c) => a + c.n, 0);
  const groups = [[0, 1], [2, 3], [4, 5, 6]];
  const cells = [];
  let x = 0;
  groups.forEach((g) => {
    const gsum = g.reduce((a, i) => a + CATEGORIES[i].n, 0);
    const w = (gsum / total) * 100;
    let y = 0;
    g.forEach((i) => {
      const c = CATEGORIES[i];
      const h = (c.n / gsum) * 100;
      cells.push({ ...c, x, y, w, h });
      y += h;
    });
    x += w;
  });
  return (
    <div className="treemap">
      {cells.map((c) => (
        <Link to="/rto?filter=Retain" key={c.name} title={`${c.name}: ${c.n} retained`}
          style={{ position: 'absolute', left: c.x + '%', top: c.y + '%', width: c.w + '%', height: c.h + '%', background: c.color, color: c.dark ? '#353543' : '#fff', borderRadius: 10, padding: '9px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', border: '2px solid #fff', textDecoration: 'none' }}>
          <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{c.name}</span>
          <span className="row" style={{ gap: 6, alignItems: 'baseline' }}>
            <b style={{ fontSize: c.n > 25 ? 22 : 17, lineHeight: 1 }}>{c.n}</b>
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{Math.round((c.n / total) * 100)}%</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
