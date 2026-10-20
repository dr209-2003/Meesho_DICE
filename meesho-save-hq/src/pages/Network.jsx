import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AGE_BUCKETS, LMDCS, REGIONS, categories, delta, fmt, inventory, lakh, lmdcRows, metrics, pct } from '../data/model';
import { lmdcReport } from '../data/reports';
import { useApp, useFilters } from '../state';
import { Bar, Columns, Funnel, StackBar } from '../components/Charts';
import { Card, Delta, I, downloadCSV, useSort } from '../components/ui';

export function Overview() {
  const { period, set, loc } = useFilters();
  const navigate = useNavigate();
  const all = LMDCS.map((l) => l.id);
  const m = metrics(all, period.range);
  const pm = period.prev ? metrics(all, period.prev) : null;
  const regions = REGIONS.map((r) => {
    const ids = LMDCS.filter((l) => l.region === r.id).map((l) => l.id);
    return { r, ids, m: metrics(ids, period.range), pm: period.prev ? metrics(ids, period.prev) : null, inv: inventory(ids) };
  });
  const open = (id) => { navigate('/?' + new URLSearchParams({ loc: id, period: period.id }).toString()); };
  const top = lmdcRows(all, period.range).sort((a, b) => b.m.soldPct - a.m.soldPct);

  return (
    <div className="stack-col">
      <div className="kpis kpis-4">
        {[
          ['RTOs received (All India)', fmt(m.rto), pm && delta(m.rto, pm.rto)],
          ['Sold locally via Meesho Quick', fmt(m.sold), pm && delta(m.sold, pm.sold)],
          ['Network sell-through', pct(m.soldPct), pm && m.soldPct - pm.soldPct, true],
          ['Reverse cost saved', lakh(m.saved), pm && delta(m.saved, pm.saved)],
        ].map(([l, v, d, pts]) => (
          <div key={l} className="kpi static"><span className="kpi-l">{l}</span><span className="kpi-m"><b>{v}</b></span><Delta v={d} pts={pts} label={period.cmp} /></div>
        ))}
      </div>

      <Card title="Regions" sub={`${period.label} · click a region to open its dashboard`}>
        <div className="regions">
          {regions.map(({ r, ids, m: rm, pm: rpm, inv }) => (
            <button key={r.id} className={'region' + (loc.region?.id === r.id ? ' cur' : '')} onClick={() => open('r:' + r.id)}>
              <span className="rg-h"><b>{r.name}</b><span className="muted">{ids.length} LMDC{ids.length > 1 ? 's' : ''}</span></span>
              <span className="rg-n">{fmt(rm.sold)}<small> sold of {fmt(rm.rto)} RTOs</small></span>
              <span className="rg-bar"><Bar v={rm.soldOfRto / 0.6} color="#2bb5a0" /><span>{pct(rm.soldOfRto)} resold</span></span>
              <span className="rg-f"><span>{lakh(rm.saved)} saved</span><span>{fmt(inv.units)} on hold</span></span>
              <Delta v={rpm ? delta(rm.sold, rpm.sold) : null} label="sold" />
            </button>
          ))}
        </div>
      </Card>

      <div className="two">
        <Card title="All-India funnel" sub="Every stage across all LMDCs">
          <Funnel stages={[
            { key: 'rto', label: 'RTO Received', color: '#e8559a', value: m.rto },
            { key: 'elig', label: 'Eligible for SAVE', color: '#9b6be8', value: m.elig },
            { key: 'pushed', label: 'Pushed to Meesho Quick', color: '#5b8def', value: m.pushed },
            { key: 'sold', label: 'Sold', color: '#2bb5a0', value: m.sold },
          ]} onPick={() => navigate('/lmdcs?' + new URLSearchParams({ loc: 'all', period: period.id }))} />
        </Card>
        <Card title="Reverse cost saved by region" sub="₹120 return leg avoided for every unit resold · click a bar">
          <Columns data={regions.map(({ r, m: rm }) => ({ key: r.id, label: r.name, value: rm.saved }))} fmtV={lakh} onPick={(d) => open('r:' + d.key)} />
        </Card>
      </div>

      <Card title="LMDC leaderboard" sub="By sell-through (sold ÷ eligible) · click to open">
        <div className="leader">
          {top.map((r, i) => (
            <button key={r.l.id} className="ld" onClick={() => open(r.l.id)}>
              <span className="ld-i">{i + 1}</span><span className="ld-n"><b>{r.l.name}</b><span className="muted">{r.region.name}</span></span>
              <Bar v={r.m.soldPct} color={r.m.soldPct >= 0.7 ? '#2bb5a0' : r.m.soldPct >= 0.6 ? '#f5b740' : '#e5484d'} /><b className="ld-v">{pct(r.m.soldPct)}</b>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function Performance() {
  const { period, set, loc } = useFilters();
  const { alerts, toast } = useApp();
  const navigate = useNavigate();
  const [region, setRegion] = useState(loc.level === 'all' ? 'all' : loc.region.id);
  const [q, setQ] = useState('');
  const srt = useSort('soldPct');
  const ids = LMDCS.filter((l) => region === 'all' || l.region === region).map((l) => l.id);
  const rows = lmdcRows(ids, period.range, period.prev).filter((r) => !q || (r.l.name + r.l.code).toLowerCase().includes(q.toLowerCase()));
  const issues = (id) => alerts.filter((a) => a.lmdc === id && !a.resolved).length;
  const get = (r, k) => (k === 'name' ? r.l.name : k === 'issues' ? issues(r.l.id) : k === 'dsold' ? (r.pm ? delta(r.m.sold, r.pm.sold) : 0) : r.m[k]);
  const open = (id) => { navigate('/?' + new URLSearchParams({ loc: id, period: period.id }).toString()); };
  const tot = metrics(ids, period.range);

  return (
    <Card title="Compare LMDCs" sub={`${period.label} · ${rows.length} LMDCs · click a row to open its dashboard`}
      right={<button className="btn btn-out btn-sm" onClick={() => { downloadCSV(`valmo-save_lmdcs_${period.id}.csv`, lmdcReport(ids, period)); toast('LMDC comparison downloaded'); }}><I.download width={16} height={16} />CSV</button>}>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <div className="chips" role="tablist" aria-label="Region">
          {[['all', 'All India'], ...REGIONS.map((r) => [r.id, r.name])].map(([id, n]) => <button key={id} role="tab" aria-selected={region === id} className={'chip' + (region === id ? ' on' : '')} onClick={() => setRegion(id)}>{n}</button>)}
        </div>
        <label className="search"><I.search width={16} height={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search LMDC or code" aria-label="Search LMDC" /></label>
      </div>
      <div className="tw">
        <table className="t hover">
          <thead><tr>
            <srt.Th k="name">LMDC</srt.Th><srt.Th k="rto" num>RTO received</srt.Th><srt.Th k="eligPct" num>Eligible %</srt.Th><srt.Th k="pushed" num>On Quick</srt.Th>
            <srt.Th k="sold" num>Sold</srt.Th><srt.Th k="soldPct" num>Sell-through</srt.Th><srt.Th k="prepaidPct" num>Prepaid %</srt.Th><srt.Th k="tat" num>Avg TAT</srt.Th>
            <srt.Th k="saved" num>Cost saved</srt.Th><srt.Th k="dsold" num>Sold Δ</srt.Th><srt.Th k="issues" num>Issues</srt.Th>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="11" className="empty">No LMDC matches “{q}”.</td></tr>}
            {[...rows].sort(srt.sorter(get)).map((r) => (
              <tr key={r.l.id} className={r.l.id === loc.id ? 'cur' : ''} onClick={() => open(r.l.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open(r.l.id)}>
                <td><b>{r.l.name}</b><div className="muted small">{r.region.name} · {r.l.code}</div></td>
                <td className="num">{fmt(r.m.rto)}</td><td className="num">{pct(r.m.eligPct)}</td><td className="num">{fmt(r.m.pushed)}</td><td className="num">{fmt(r.m.sold)}</td>
                <td className="num"><span className="row end" style={{ gap: 8 }}><Bar v={r.m.soldPct} color={r.m.soldPct >= 0.7 ? '#2bb5a0' : r.m.soldPct >= 0.6 ? '#f5b740' : '#e5484d'} /><b>{pct(r.m.soldPct)}</b></span></td>
                <td className="num">{pct(r.m.prepaidPct)}</td><td className="num">{r.m.tat.toFixed(1)} d</td><td className="num">{lakh(r.m.saved)}</td>
                <td className="num"><Delta v={r.pm ? delta(r.m.sold, r.pm.sold) : null} label="" /></td>
                <td className="num">{issues(r.l.id) ? <span className={'dot-n ' + (issues(r.l.id) > 1 ? 'r' : 'a')}>{issues(r.l.id)}</span> : <span className="dot-n g">0</span>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td><b>Total</b></td><td className="num">{fmt(tot.rto)}</td><td className="num">{pct(tot.eligPct)}</td><td className="num">{fmt(tot.pushed)}</td><td className="num">{fmt(tot.sold)}</td><td className="num"><b>{pct(tot.soldPct)}</b></td><td className="num">{pct(tot.prepaidPct)}</td><td className="num">{tot.tat.toFixed(1)} d</td><td className="num">{lakh(tot.saved)}</td><td /><td /></tr></tfoot>
        </table>
      </div>
    </Card>
  );
}

export function Inventory() {
  const { loc, period, set, qs } = useFilters();
  const ids = loc.level === 'lmdc' ? LMDCS.filter((l) => l.region === loc.lmdc.region).map((l) => l.id) : loc.ids;
  const inv = inventory(loc.ids);
  const peers = inventory(ids).perLmdc.sort((a, b) => b.util - a.util);
  const cats = categories(loc.ids, period.range);
  const held = cats.map((c) => ({ ...c, h: Math.round((inv.units * (c.elig - c.sold)) / Math.max(1, cats.reduce((a, x) => a + (x.elig - x.sold), 0))) })).sort((a, b) => b.h - a.h);
  const srt = useSort('util');
  return (
    <div className="stack-col">
      <div className="kpis kpis-4">
        <div className="kpi static"><span className="kpi-l">Units on hold · {loc.short}</span><span className="kpi-m"><b>{fmt(inv.units)}</b></span><span className="muted small">as of 20 Oct 2026</span></div>
        <div className="kpi static"><span className="kpi-l">Shelf capacity used</span><span className="kpi-m"><b>{pct(inv.units / inv.cap)}</b></span><span className="muted small">{fmt(inv.cap)} slots · alert at 90%</span></div>
        <div className="kpi static"><span className="kpi-l">Fresh (0–7 days)</span><span className="kpi-m"><b>{fmt(inv.buckets[0])}</b></span><span className="muted small">{pct(inv.buckets[0] / Math.max(1, inv.units))} of stock</span></div>
        <div className="kpi static" style={{ background: '#fde8e8' }}><span className="kpi-l">Past 21 days</span><span className="kpi-m"><b style={{ color: '#c0262d' }}>{fmt(inv.buckets[3])}</b></span><Link to={'/alerts' + qs} className="link small">Send to RTO ›</Link></div>
      </div>
      <Card title="Ageing and capacity by LMDC" sub={loc.level === 'lmdc' ? `${loc.region.name} peers · ${loc.short} highlighted` : loc.label}>
        <div className="row wrap" style={{ gap: 14, marginBottom: 10 }}>
          {AGE_BUCKETS.map(([l, c]) => <span key={l} className="lg"><i style={{ background: c }} />{l}</span>)}
        </div>
        <div className="tw">
          <table className="t hover">
            <thead><tr><srt.Th k="name">LMDC</srt.Th><th style={{ minWidth: 240 }}>Age of units on hold</th><srt.Th k="units" num>Units</srt.Th><srt.Th k="over" num>Past 21 d</srt.Th><srt.Th k="util" num>Shelf used</srt.Th></tr></thead>
            <tbody>
              {[...peers].sort(srt.sorter((r, k) => (k === 'name' ? r.l.name : k === 'over' ? r.buckets[3] : r[k]))).map((r) => (
                <tr key={r.l.id} className={r.l.id === loc.id ? 'cur' : ''} onClick={() => set({ loc: r.l.id })}>
                  <td><b>{r.l.name}</b></td>
                  <td><StackBar parts={AGE_BUCKETS.map(([label, color], i) => ({ label, color, value: r.buckets[i] }))} /></td>
                  <td className="num">{fmt(r.units)}</td><td className="num">{fmt(r.buckets[3])}</td>
                  <td className="num"><b className={r.util > 0.9 ? 'r' : r.util > 0.8 ? 'a' : 'g'}>{pct(r.util)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="What is on the shelf" sub={`${loc.short} · estimated units on hold by category`}>
        <div className="list">
          {held.map((c) => (
            <div key={c.name} className="list-row static"><span className="lr-n"><b>{c.name}</b><span className="muted">sell-through {pct(c.st)}</span></span><Bar v={c.h / held[0].h} /><span className="lr-v">{fmt(c.h)}</span></div>
          ))}
        </div>
      </Card>
    </div>
  );
}
