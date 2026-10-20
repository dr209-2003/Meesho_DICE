import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_SETTINGS, fmt, fmtDate, lakh, metrics, orders, pct } from '../data/model';
import { alertReport, categoryReport, fileSlug, fullReport, lmdcReport, summaryReport } from '../data/reports';
import { useApp, useFilters } from '../state';
import { Badge, Card, I, downloadCSV, useSort } from '../components/ui';
import { SEV, useAlertAction } from '../components/AlertAction';

const ST = { Delivered: 'green', 'Out for delivery': 'violet', Packed: 'amber', Placed: 'blue', Cancelled: 'red' };

export function Orders() {
  const { loc, period } = useFilters();
  const [status, setStatus] = useState('All');
  const [pay, setPay] = useState('All');
  const [q, setQ] = useState('');
  const { rows, total } = orders(loc.ids, period.range, 60);
  const m = metrics(loc.ids, period.range);
  const list = rows.filter((o) => (status === 'All' || o.status === status) && (pay === 'All' || o.pay === pay) && (!q || (o.id + o.cat + o.area + o.lmdc.name).toLowerCase().includes(q.toLowerCase())));
  const srt = useSort('when');
  const get = (o, k) => (k === 'when' ? o.day * 1440 + o.hour * 60 + o.min : k === 'tat' ? o.tat ?? 99 : o[k]);
  return (
    <div className="stack-col">
      <div className="kpis kpis-4">
        <div className="kpi static"><span className="kpi-l">Meesho Quick orders</span><span className="kpi-m"><b>{fmt(m.sold)}</b></span><span className="muted small">{loc.short} · {period.label}</span></div>
        <div className="kpi static"><span className="kpi-l">Prepaid</span><span className="kpi-m"><b>{pct(m.prepaidPct)}</b></span><span className="muted small">{fmt(m.prepaid)} orders</span></div>
        <div className="kpi static"><span className="kpi-l">Avg delivery TAT</span><span className="kpi-m"><b>{m.tat.toFixed(1)} days</b></span><span className="muted small">regular orders ~3.0 days</span></div>
        <div className="kpi static"><span className="kpi-l">Order value (est.)</span><span className="kpi-m"><b>{lakh(m.sold * 420)}</b></span><span className="muted small">at ~₹420 average</span></div>
      </div>
      <Card title="Recent orders" sub={`Latest ${rows.length} of ${fmt(total)} orders · sample records`}>
        <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
          <div className="chips" role="tablist" aria-label="Status">{['All', 'Placed', 'Packed', 'Out for delivery', 'Delivered', 'Cancelled'].map((s) => <button key={s} role="tab" aria-selected={status === s} className={'chip' + (status === s ? ' on' : '')} onClick={() => setStatus(s)}>{s}</button>)}</div>
          <div className="chips" role="tablist" aria-label="Payment">{['All', 'Prepaid', 'COD'].map((s) => <button key={s} role="tab" aria-selected={pay === s} className={'chip' + (pay === s ? ' on' : '')} onClick={() => setPay(s)}>{s === 'All' ? 'Any payment' : s}</button>)}</div>
          <label className="search"><I.search width={16} height={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order, category, area" aria-label="Search orders" /></label>
        </div>
        <div className="tw">
          <table className="t">
            <thead><tr><th>Order</th><srt.Th k="when">Placed</srt.Th><th>Category</th><th>LMDC → area</th><srt.Th k="km" num>Distance</srt.Th><srt.Th k="value" num>Value</srt.Th><th>Payment</th><th>Status</th><srt.Th k="tat" num>TAT</srt.Th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan="9" className="empty">No orders match these filters. <button className="link" onClick={() => { setStatus('All'); setPay('All'); setQ(''); }}>Clear filters</button></td></tr>}
              {[...list].sort(srt.sorter(get)).map((o) => (
                <tr key={o.id}>
                  <td className="strong">{o.id}</td><td>{fmtDate(o.day, false)}, {String(o.hour).padStart(2, '0')}:{String(o.min).padStart(2, '0')}</td><td>{o.cat}</td>
                  <td>{o.lmdc.name} → {o.area}</td><td className="num">{o.km} km</td><td className="num">₹{o.value}</td>
                  <td><Badge c={o.pay === 'Prepaid' ? 'green' : 'grey'}>{o.pay}</Badge></td><td><Badge c={ST[o.status]}>{o.status}</Badge></td>
                  <td className="num">{o.tat ? o.tat + ' d' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function Alerts() {
  const { loc, qs } = useFilters();
  const { alerts, toast } = useApp();
  const [openAction, modal] = useAlertAction();
  const [scope, setScope] = useState(loc.level === 'all' ? 'all' : 'loc');
  const [show, setShow] = useState('Open');
  const [sev, setSev] = useState('All');
  const list = alerts.filter((a) => (scope === 'all' || loc.ids.includes(a.lmdc)) && (show === 'All' || (show === 'Open' ? !a.resolved : !!a.resolved)) && (sev === 'All' || a.sev === sev));
  const base = alerts.filter((a) => scope === 'all' || loc.ids.includes(a.lmdc));
  return (
    <Card title="Issues & alerts" sub={`${base.filter((a) => !a.resolved).length} open · ${base.filter((a) => a.resolved).length} resolved · rules can be tuned in Settings`}
      right={<button className="btn btn-out btn-sm" onClick={() => { downloadCSV('valmo-save_alerts.csv', alertReport(list)); toast('Alerts downloaded'); }}><I.download width={16} height={16} />CSV</button>}>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        {loc.level !== 'all' && <div className="chips">{[['loc', loc.short], ['all', 'All India']].map(([k, n]) => <button key={k} className={'chip' + (scope === k ? ' on' : '')} aria-pressed={scope === k} onClick={() => setScope(k)}>{n}</button>)}</div>}
        <div className="chips">{['Open', 'Resolved', 'All'].map((k) => <button key={k} className={'chip' + (show === k ? ' on' : '')} aria-pressed={show === k} onClick={() => setShow(k)}>{k}</button>)}</div>
        <div className="chips">{[['All', 'Any severity'], ['high', 'High'], ['med', 'Medium'], ['low', 'Low']].map(([k, n]) => <button key={k} className={'chip' + (sev === k ? ' on' : '')} aria-pressed={sev === k} onClick={() => setSev(k)}>{n}</button>)}</div>
      </div>
      <div className="alerts big">
        {list.length === 0 && <div className="empty-box"><I.check width={28} height={28} /><b>Nothing here</b><span className="muted">{show === 'Open' ? 'All alerts for this view are resolved.' : 'No alerts match these filters.'}</span></div>}
        {list.map((a) => (
          <div key={a.id} className={'al' + (a.resolved ? ' done' : '')}>
            <span className={'al-ic s-' + a.sev}><I.alert width={16} height={16} /></span>
            <span className="al-t"><b>{a.title}</b><span className="muted">{a.where} · {a.kind}{a.resolved ? ` · resolved ${new Date(a.resolved.at).toLocaleDateString('en-IN')}` : ''}</span><span className="small">{a.detail}</span></span>
            <Badge c={SEV[a.sev][1]}>{SEV[a.sev][0]}</Badge>
            <button className={'btn btn-sm ' + (a.resolved ? 'btn-ghost' : 'btn-soft')} onClick={() => openAction(a)}>{a.resolved ? 'View / reopen' : a.action}</button>
          </div>
        ))}
      </div>
      {modal}
      <p className="muted small" style={{ marginTop: 12 }}>Alert status is saved in this browser. <Link to={'/settings' + qs} className="link">Change thresholds ›</Link></p>
    </Card>
  );
}

export function Reports() {
  const { loc, period } = useFilters();
  const { alerts, toast } = useApp();
  const slug = fileSlug(loc, period);
  const items = [
    ['Full report', 'Summary, funnel, trend, inventory, LMDC and category breakdowns and alerts in one file', () => fullReport(loc, period, alerts), slug],
    ['Performance summary', 'KPIs, funnel stages, inventory ageing and the sell-through trend', () => summaryReport(loc, period), slug + '_summary'],
    ['LMDC comparison', 'One row per LMDC with every funnel stage and rate', () => lmdcReport(loc.ids, period), slug + '_lmdcs'],
    ['Category performance', 'RTO, eligible, sold and sell-through for each category', () => categoryReport(loc.ids, period), slug + '_categories'],
    ['Alerts log', 'All alerts for this location with status and notes', () => alertReport(alerts.filter((a) => loc.ids.includes(a.lmdc))), slug + '_alerts'],
  ];
  return (
    <Card title="Download reports" sub={`${loc.label} · ${period.label} · CSV files open in Excel or Google Sheets`}>
      <div className="reports">
        {items.map(([t, d, rows, name]) => (
          <div key={t} className="rep">
            <span className="rep-ic"><I.report /></span>
            <span className="rep-t"><b>{t}</b><span className="muted">{d}</span></span>
            <button className="btn btn-out btn-sm" onClick={() => { downloadCSV(name + '.csv', rows()); toast(`${t} downloaded`); }}><I.download width={16} height={16} />Download</button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Settings() {
  const { settings, setSettings, resetAll, toast } = useApp();
  const [f, setF] = useState({ ...settings });
  const fields = [
    ['minSellThrough', 'Low sell-through alert below', '%', 100, 'A category at an LMDC is flagged when sold ÷ eligible falls below this (last 30 days).'],
    ['maxQc', 'QC rejection alert above', '%', 100, 'Share of retained units failing hub QC.'],
    ['maxTat', 'Delivery TAT alert above', 'days', 1, 'Average delivery time of SAVE orders in the last 7 days.'],
    ['maxShelf', 'Shelf capacity alert above', '%', 100, 'Units on hold ÷ hold-shelf slots.'],
    ['maxOverdue', 'Ageing alert above', 'units past 21 days', 1, 'Units that crossed the 21-day hold limit and must go back to the seller.'],
  ];
  return (
    <Card title="Alert thresholds" sub="Changes apply to Issues & Alerts immediately and are saved in this browser">
      <form className="settings" onSubmit={(e) => { e.preventDefault(); setSettings(f); toast('Thresholds saved · alerts updated'); }}>
        {fields.map(([k, l, unit, mul, help]) => (
          <label key={k} className="set">
            <span><b>{l}</b><span className="muted small">{help}</span></span>
            <span className="set-in"><input type="number" step="any" min="0" value={+(f[k] * mul).toFixed(1)} onChange={(e) => setF((x) => ({ ...x, [k]: Number(e.target.value) / mul }))} /><span className="muted">{unit}</span></span>
          </label>
        ))}
        <div className="row end" style={{ gap: 8, marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => { setF(DEFAULT_SETTINGS); setSettings(DEFAULT_SETTINGS); toast('Default thresholds restored'); }}>Restore defaults</button>
          <button type="button" className="btn btn-ghost" onClick={() => { resetAll(); setF(DEFAULT_SETTINGS); toast('Demo reset: thresholds and alert statuses cleared'); }}>Reset demo</button>
          <button type="submit" className="btn btn-pri">Save thresholds</button>
        </div>
      </form>
    </Card>
  );
}

export function NotFound() {
  return <Card title="Page not found"><p className="muted">This page does not exist. <Link to="/" className="link">Go to the dashboard ›</Link></p></Card>;
}
