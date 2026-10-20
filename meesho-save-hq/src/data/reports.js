import { AGE_BUCKETS, REVERSE_COST, categories, fmtDate, inventory, lmdcRows, metrics, trend } from './model';

const r1 = (x) => Math.round(x * 1000) / 10;

export function summaryReport(loc, period) {
  const m = metrics(loc.ids, period.range);
  const inv = inventory(loc.ids);
  const rows = [
    ['Valmo-SAVE performance report'], ['Location', loc.label], ['Period', period.label], ['Generated', new Date().toLocaleString('en-IN')], [],
    ['Metric', 'Value'],
    ['RTO received', m.rto], ['Eligible for SAVE', m.elig], ['Eligible % of RTO', r1(m.eligPct)],
    ['Listed on Meesho Quick', m.pushed], ['Sold via Meesho Quick', m.sold], ['Sell-through % (sold / eligible)', r1(m.soldPct)],
    ['Avg delivery TAT, SAVE orders (days)', m.tat.toFixed(2)], ['Prepaid % of SAVE orders', r1(m.prepaidPct)],
    [`Reverse cost saved (₹${REVERSE_COST} per unit sold)`, m.saved], [],
    ['Current hold inventory (units)', inv.units], ...AGE_BUCKETS.map(([l], i) => [l, inv.buckets[i]]), [],
    ['Sell-through trend'], ['Bucket', 'From', 'To', 'Eligible', 'Sold', 'Sell-through %'],
    ...trend(loc.ids, period.range).map((p) => [p.label, fmtDate(p.a), fmtDate(p.e), p.elig, p.sold, r1(p.v)]),
  ];
  return rows;
}

export function lmdcReport(ids, period) {
  return [
    ['LMDC', 'Code', 'Region', 'RTO received', 'Eligible', 'Eligible %', 'Listed on Quick', 'Sold', 'Sell-through %', 'Prepaid %', 'Avg TAT (days)', 'Reverse cost saved (₹)'],
    ...lmdcRows(ids, period.range).map(({ l, region, m }) => [l.name, l.code, region.name, m.rto, m.elig, r1(m.eligPct), m.pushed, m.sold, r1(m.soldPct), r1(m.prepaidPct), m.tat.toFixed(2), m.saved]),
  ];
}

export function categoryReport(ids, period) {
  return [
    ['Category', 'RTO received', 'Eligible', 'Sold via Quick', 'Sell-through %', 'Avg TAT (days)'],
    ...categories(ids, period.range).map((c) => [c.name, c.rto, c.elig, c.sold, r1(c.st), c.tat]),
  ];
}

export function alertReport(alerts) {
  return [
    ['Severity', 'Type', 'Alert', 'Location', 'Recommended action', 'Status', 'Resolved at', 'Note'],
    ...alerts.map((a) => [a.sev, a.kind, a.title, a.where, a.detail, a.resolved ? 'Resolved' : 'Open', a.resolved?.at || '', a.resolved?.note || '']),
  ];
}

export function fullReport(loc, period, alerts) {
  return [...summaryReport(loc, period), [], ['LMDC breakdown'], ...lmdcReport(loc.ids, period), [], ['Category breakdown'], ...categoryReport(loc.ids, period), [], ['Alerts'], ...alertReport(alerts.filter((a) => loc.ids.includes(a.lmdc)))];
}
export const fileSlug = (loc, period) => `valmo-save_${loc.short.toLowerCase().replace(/\s+/g, '-')}_${period.id}`;
