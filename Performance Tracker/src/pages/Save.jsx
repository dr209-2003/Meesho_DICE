import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AGE_BUCKETS, LMDCS, REGULAR, categories, delta, fmt, inventory, lakh, lmdcRows, metrics, pct, trend } from '../data/model';
import { useApp, useFilters } from '../state';
import { Bar, Donut, Funnel, Line } from '../components/Charts';
import { Card, Delta, Drawer, I, useSort } from '../components/ui';
import { useAlertAction } from '../components/AlertAction';

const KPIS = [
  { key: 'rto', label: 'Total RTO Received', icon: 'box', tint: '#fde6ee', ink: '#c0264f' },
  { key: 'elig', label: 'Eligible for SAVE', icon: 'check', tint: '#e3f6ee', ink: '#038d63' },
  { key: 'sold', label: 'Sold via Meesho Quick', icon: 'cart', tint: '#e7eefc', ink: '#3d6ce0' },
  { key: 'tat', label: 'Avg. Delivery TAT', icon: 'truck', tint: '#efe7fd', ink: '#7b3fe4' },
  { key: 'prepaid', label: 'Prepaid %', icon: 'wallet', tint: '#fdeef7', ink: '#c42a86' },
  { key: 'saved', label: 'Reverse Cost Saved', icon: 'rupee', tint: '#fef3dc', ink: '#b07400' },
];
const STAGES = [
  { key: 'rto', label: 'RTO Received', color: '#e8559a' },
  { key: 'elig', label: 'Eligible for SAVE', color: '#9b6be8' },
  { key: 'pushed', label: 'Pushed to Meesho Quick', color: '#5b8def' },
  { key: 'sold', label: 'Sold', color: '#2bb5a0' },
];
const LABEL = { rto: 'RTO received', elig: 'Eligible for SAVE', pushed: 'Pushed to Meesho Quick', sold: 'Sold via Meesho Quick', tat: 'Avg delivery TAT (days)', prepaid: 'Prepaid % of SAVE orders', saved: 'Reverse cost saved' };
const val = (m, k) => (k === 'tat' ? m.tat : k === 'prepaid' ? m.prepaidPct : k === 'saved' ? m.saved : m[k]);
const show = (k, v) => (k === 'tat' ? v.toFixed(1) + ' days' : k === 'prepaid' ? pct(v) : k === 'saved' ? lakh(v) : fmt(v));

function Kpi({ k, m, pm, cmp, onClick }) {
  const Ic = I[k.icon];
  const main = { rto: fmt(m.rto), elig: fmt(m.elig), sold: fmt(m.sold), tat: m.tat.toFixed(1) + ' days', prepaid: pct(m.prepaidPct), saved: lakh(m.saved) }[k.key];
  const side = { elig: pct(m.eligPct), sold: pct(m.soldPct) }[k.key];
  const sub = { tat: '(for SAVE orders)', prepaid: '(SAVE orders)' }[k.key];
  let d;
  if (k.key === 'tat') d = <Delta v={(m.tat - REGULAR.tat) / REGULAR.tat} invert label="vs regular orders" />;
  else if (k.key === 'prepaid') d = <Delta v={m.prepaidPct - REGULAR.prepaid} pts label="vs regular" />;
  else d = <Delta v={pm ? delta(val(m, k.key), val(pm, k.key)) : null} label={cmp} />;
  return (
    <button className="kpi" style={{ background: k.tint }} onClick={onClick} aria-label={`${k.label}: ${main}. Show breakdown`}>
      <span className="kpi-l">{k.label} {sub && <small>{sub}</small>}</span>
      <span className="kpi-m"><span className="kpi-ic" style={{ color: k.ink }}><Ic width={26} height={26} /></span><b>{main}</b>{side && <span className="kpi-s">({side})</span>}</span>
      {d}
    </button>
  );
}

function Breakdown({ metric, loc, period, onClose, setLoc }) {
  if (!metric) return null;
  const k = metric;
  const isRate = k === 'tat' || k === 'prepaid';
  const multi = loc.ids.length > 1;
  const peers = multi ? loc.ids : isRate ? LMDCS.filter((l) => l.region === loc.lmdc.region).map((l) => l.id) : null;
  const ttl = LABEL[k];
  if (peers) {
    const rows = lmdcRows(peers, period.range).map((r) => ({ ...r, v: val(r.m, k) })).sort((a, b) => (k === 'tat' ? a.v - b.v : b.v - a.v));
    const max = Math.max(...rows.map((r) => r.v));
    return (
      <Drawer open title={`${ttl} · by LMDC`} sub={`${multi ? loc.label : loc.region.name + ' peers'} · ${period.label}. Click an LMDC to open it.`} onClose={onClose}>
        <div className="list">
          {rows.map((r) => (
            <button key={r.l.id} className={'list-row' + (r.l.id === loc.id ? ' cur' : '')} onClick={() => { setLoc(r.l.id); onClose(); }}>
              <span className="lr-n"><b>{r.l.name}</b><span className="muted">{r.region.name} · {r.l.code}</span></span>
              <Bar v={r.v / max} color={k === 'tat' ? '#7b3fe4' : '#9f2089'} />
              <span className="lr-v">{show(k, r.v)}</span>
            </button>
          ))}
        </div>
      </Drawer>
    );
  }
  const cats = categories(loc.ids, period.range);
  const field = k === 'sold' || k === 'saved' ? 'sold' : k === 'rto' ? 'rto' : 'elig';
  const rows = [...cats].sort((a, b) => b[field] - a[field]);
  const max = Math.max(...rows.map((r) => r[field]));
  return (
    <Drawer open title={`${ttl} · by category`} sub={`${loc.label} · ${period.label}`} onClose={onClose}>
      {k === 'pushed' && <p className="note">Category split shown for eligible units; {pct(metrics(loc.ids, period.range).pushed / metrics(loc.ids, period.range).elig)} of eligible units passed QC and were listed.</p>}
      <div className="list">
        {rows.map((c) => (
          <div key={c.name} className="list-row static">
            <span className="lr-n"><b>{c.name}</b><span className="muted">sell-through {pct(c.st)}</span></span>
            <Bar v={c[field] / max} />
            <span className="lr-v">{k === 'saved' ? lakh(c.sold * 120) : fmt(c[field])}</span>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

export default function Save() {
  const { loc, period, set, qs } = useFilters();
  const { alerts } = useApp();
  const [metric, setMetric] = useState(null);
  const [openAction, actionModal] = useAlertAction();
  const m = metrics(loc.ids, period.range);
  const pm = period.prev ? metrics(loc.ids, period.prev) : null;
  const tr = trend(loc.ids, period.range);
  const inv = inventory(loc.ids);
  const cats = categories(loc.ids, period.range);
  const catSort = useSort('st');
  const [allCats, setAllCats] = useState(false);
  const lmSort = useSort('rto');
  const tableIds = loc.level === 'lmdc' ? LMDCS.filter((l) => l.region === loc.lmdc.region).map((l) => l.id) : loc.ids;
  const lrows = lmdcRows(tableIds, period.range);
  const own = alerts.filter((a) => loc.ids.includes(a.lmdc));
  const near = loc.level === 'lmdc' ? alerts.filter((a) => !loc.ids.includes(a.lmdc) && LMDCS.find((l) => l.id === a.lmdc).region === loc.lmdc.region) : [];
  const locAlerts = [...own, ...near];
  const issues = (id) => alerts.filter((a) => a.lmdc === id && !a.resolved).length;
  const tableTitle = loc.level === 'lmdc' ? `${loc.region.name}` : loc.short;

  return (
    <div className="grid-save">
      <div className="kpis">
        {KPIS.map((k) => <Kpi key={k.key} k={k} m={m} pm={pm} cmp={period.cmp} onClick={() => setMetric(k.key)} />)}
      </div>

      <Card title="RTO Funnel (This Period)" sub={`${loc.short} · click a stage for the breakdown`} className="c-funnel">
        <Funnel stages={STAGES.map((s) => ({ ...s, value: m[s.key] }))} onPick={(s) => setMetric(s.key)} />
        <div className="fun-foot">
          <span><b>{pct(m.soldOfRto)}</b> of all RTOs resold locally</span>
          <span><b>{fmt(m.elig - m.sold)}</b> eligible units not sold (held or returned)</span>
        </div>
      </Card>

      <Card title="Sell-through Trend (SAVE Inventory)" sub="Cumulative sold ÷ eligible units in the period" className="c-trend">
        <Line points={tr} />
      </Card>

      <Card title="Inventory Health (Current)" sub={`Units on hold today · ${pct(inv.units / inv.cap)} of shelf capacity`} className="c-inv"
        right={<Link to={'/inventory' + qs} className="link">Details ›</Link>}>
        <div className="inv">
          <Donut parts={AGE_BUCKETS.map(([label, color], i) => ({ label, color, value: inv.buckets[i] }))} center={fmt(inv.units)} sub="units" />
          <ul className="legend-v">
            {AGE_BUCKETS.map(([label, color], i) => (
              <li key={label}><i style={{ background: color }} /><span>{label}</span><b>{pct(inv.buckets[i] / Math.max(1, inv.units))}</b></li>
            ))}
          </ul>
        </div>
      </Card>

      <Card title="Top SKUs (by resale rate)" sub={`${loc.short} · ${period.label}`} className="c-sku">
        <div className="tw">
          <table className="t compact">
            <thead><tr><th>#</th><catSort.Th k="name">Product</catSort.Th><catSort.Th k="rto" num>RTO Received</catSort.Th><catSort.Th k="sold" num>Sold via Quick</catSort.Th><catSort.Th k="st" num>Sell-through %</catSort.Th><catSort.Th k="tat" num>Avg. Delivery TAT</catSort.Th></tr></thead>
            <tbody>
              {[...cats].sort(catSort.sorter((r, k) => r[k])).slice(0, allCats ? 99 : 5).map((c, i) => (
                <tr key={c.name}>
                  <td className="muted">{i + 1}</td><td className="strong">{c.name}</td><td className="num">{fmt(c.rto)}</td><td className="num">{fmt(c.sold)}</td>
                  <td className="num"><span className={c.st >= 0.6 ? 'g' : c.st >= 0.35 ? 'a' : 'r'}>{pct(c.st)}</span></td><td className="num">{c.tat} d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="more" onClick={() => setAllCats((v) => !v)}>{allCats ? 'Show top 5' : `Show all ${cats.length} categories`}</button>
      </Card>

      <Card title={`LMDC-wise Performance (${tableTitle})`} sub="Click a row to open that LMDC" className="c-lmdc" right={<Link to={'/lmdcs' + qs} className="link" style={{ whiteSpace: 'nowrap' }}>Compare ›</Link>}>
        <div className="tw">
          <table className="t hover compact">
            <thead><tr><lmSort.Th k="name">LMDC</lmSort.Th><lmSort.Th k="rto" num>RTO Received</lmSort.Th><lmSort.Th k="eligPct" num>Eligible %</lmSort.Th><lmSort.Th k="soldPct" num>Sold %</lmSort.Th><lmSort.Th k="prepaidPct" num>Prepaid %</lmSort.Th><lmSort.Th k="issues" num>Issues</lmSort.Th></tr></thead>
            <tbody>
              {[...lrows].sort(lmSort.sorter((r, k) => (k === 'name' ? r.l.name : k === 'issues' ? issues(r.l.id) : r.m[k]))).map((r) => (
                <tr key={r.l.id} className={r.l.id === loc.id ? 'cur' : ''} onClick={() => set({ loc: r.l.id })} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && set({ loc: r.l.id })}>
                  <td className="strong">{r.l.name}</td><td className="num">{fmt(r.m.rto)}</td><td className="num">{pct(r.m.eligPct)}</td>
                  <td className="num"><span className={r.m.soldPct >= 0.7 ? 'g' : r.m.soldPct >= 0.6 ? 'a' : 'r'}>{pct(r.m.soldPct)}</span></td>
                  <td className="num">{pct(r.m.prepaidPct)}</td>
                  <td className="num">{issues(r.l.id) ? <span className={'dot-n ' + (issues(r.l.id) > 1 ? 'r' : 'a')}>{issues(r.l.id)}</span> : <span className="dot-n g">0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Alerts & Actions" sub={`${own.filter((a) => !a.resolved).length} open for ${loc.short}${near.length ? ` · ${near.filter((a) => !a.resolved).length} more in ${loc.region.name}` : ''}`} className="c-alerts" right={<Link to={'/alerts' + qs} className="link">View all ›</Link>}>
        <div className="alerts">
          {locAlerts.length === 0 && <p className="muted" style={{ margin: 8 }}>No issues for this location. 🎉</p>}
          {locAlerts.slice(0, 4).map((a) => (
            <div key={a.id} className={'al' + (a.resolved ? ' done' : '')}>
              <span className={'al-ic s-' + a.sev}><I.alert width={16} height={16} /></span>
              <span className="al-t"><b>{a.title}</b><span className="muted">{a.where} · {a.kind}</span></span>
              <button className={'btn btn-sm ' + (a.resolved ? 'btn-ghost' : 'btn-soft')} onClick={() => openAction(a)}>{a.resolved ? 'Resolved ✓' : a.action}</button>
            </div>
          ))}
          {locAlerts.length > 4 && <Link to={'/alerts' + qs} className="link" style={{ padding: '4px 8px' }}>+ {locAlerts.length - 4} more</Link>}
        </div>
      </Card>

      <Breakdown metric={metric} loc={loc} period={period} onClose={() => setMetric(null)} setLoc={(id) => set({ loc: id })} />
      {actionModal}
    </div>
  );
}
