// Illustrative data model for the Valmo-SAVE HQ dashboard.
// Daily numbers are generated deterministically (seeded), so every filter combination is consistent
// and the headline view (Delhi NCR · Okhla, September 2026) matches the figures in the deck.

export const START = Date.UTC(2026, 7, 1); // 1 Aug 2026
export const DAYS = 81; // through 20 Oct 2026 (today)
const DAY = 86400000;
export const REVERSE_COST = 120; // ₹ reverse leg avoided per unit resold
export const REGULAR = { tat: 3.0, prepaid: 0.57 };

export const REGIONS = [
  { id: 'ncr', name: 'Delhi NCR' },
  { id: 'mum', name: 'Mumbai' },
  { id: 'blr', name: 'Bengaluru' },
  { id: 'hyd', name: 'Hyderabad' },
  { id: 'kol', name: 'Kolkata' },
  { id: 'jpr', name: 'Jaipur' },
];

// rto = September RTO received; e = eligible share; push = listed on Quick / eligible; s = sold / eligible;
// p = prepaid share of Quick orders; tat = avg delivery days for SAVE orders; cap = hold-shelf slots; qc = QC rejection rate
export const LMDCS = [
  { id: 'okhla', name: 'Okhla', code: 'LMDC-DL-07', region: 'ncr', rto: 12480, e: 0.718, push: 0.876, s: 0.75, p: 0.82, tat: 1.8, cap: 2600, qc: 0.021, exact: { elig: 8960, pushed: 7850, sold: 6720 } },
  { id: 'gurgaon', name: 'Gurgaon', code: 'LMDC-HR-02', region: 'ncr', rto: 5320, e: 0.66, push: 0.87, s: 0.71, p: 0.78, tat: 1.9, cap: 1150, qc: 0.032 },
  { id: 'noida', name: 'Noida', code: 'LMDC-UP-04', region: 'ncr', rto: 6990, e: 0.68, push: 0.86, s: 0.70, p: 0.76, tat: 1.8, cap: 1300, qc: 0.054 },
  { id: 'ghaziabad', name: 'Ghaziabad', code: 'LMDC-UP-06', region: 'ncr', rto: 5420, e: 0.63, push: 0.85, s: 0.65, p: 0.74, tat: 2.4, cap: 1100, qc: 0.028 },
  { id: 'faridabad', name: 'Faridabad', code: 'LMDC-HR-05', region: 'ncr', rto: 4310, e: 0.61, push: 0.84, s: 0.62, p: 0.71, tat: 2.1, cap: 900, qc: 0.035 },
  { id: 'dwarka', name: 'Dwarka', code: 'LMDC-DL-14', region: 'ncr', rto: 4870, e: 0.65, push: 0.87, s: 0.68, p: 0.77, tat: 1.9, cap: 1000, qc: 0.024 },
  { id: 'andheri', name: 'Andheri', code: 'LMDC-MH-03', region: 'mum', rto: 7820, e: 0.67, push: 0.88, s: 0.69, p: 0.80, tat: 1.9, cap: 1420, qc: 0.026 },
  { id: 'thane', name: 'Thane', code: 'LMDC-MH-09', region: 'mum', rto: 5110, e: 0.62, push: 0.85, s: 0.63, p: 0.72, tat: 2.2, cap: 1000, qc: 0.041 },
  { id: 'navimumbai', name: 'Navi Mumbai', code: 'LMDC-MH-11', region: 'mum', rto: 4380, e: 0.60, push: 0.84, s: 0.60, p: 0.70, tat: 2.3, cap: 850, qc: 0.03 },
  { id: 'whitefield', name: 'Whitefield', code: 'LMDC-KA-02', region: 'blr', rto: 6240, e: 0.70, push: 0.89, s: 0.73, p: 0.84, tat: 1.7, cap: 1350, qc: 0.019 },
  { id: 'ecity', name: 'Electronic City', code: 'LMDC-KA-05', region: 'blr', rto: 4980, e: 0.66, push: 0.87, s: 0.67, p: 0.79, tat: 1.9, cap: 1000, qc: 0.027 },
  { id: 'gachibowli', name: 'Gachibowli', code: 'LMDC-TS-01', region: 'hyd', rto: 5560, e: 0.64, push: 0.86, s: 0.66, p: 0.77, tat: 2.0, cap: 1100, qc: 0.031 },
  { id: 'saltlake', name: 'Salt Lake', code: 'LMDC-WB-03', region: 'kol', rto: 4720, e: 0.58, push: 0.83, s: 0.57, p: 0.66, tat: 2.5, cap: 900, qc: 0.047 },
  { id: 'sanganer', name: 'Sanganer', code: 'LMDC-RJ-02', region: 'jpr', rto: 3640, e: 0.55, push: 0.82, s: 0.54, p: 0.63, tat: 2.6, cap: 700, qc: 0.038 },
];
export const lmdcById = (id) => LMDCS.find((l) => l.id === id);
export const regionById = (id) => REGIONS.find((r) => r.id === id);

export const CATEGORIES = [
  { name: 'Women kurtis', share: 0.13, st: 1.16, tat: 1.6 },
  { name: 'Sneakers', share: 0.09, st: 1.09, tat: 1.7 },
  { name: 'T-shirts', share: 0.08, st: 1.04, tat: 1.5 },
  { name: 'Sarees', share: 0.10, st: 0.98, tat: 1.9 },
  { name: 'Bedsheets', share: 0.08, st: 1.06, tat: 1.8 },
  { name: 'Home storage', share: 0.07, st: 1.0, tat: 2.1 },
  { name: 'Kids wear', share: 0.08, st: 1.03, tat: 1.7 },
  { name: 'Beauty & skincare', share: 0.07, st: 0.94, tat: 1.6 },
  { name: 'Kitchen tools', share: 0.07, st: 0.86, tat: 2.0 },
  { name: 'Watches', share: 0.05, st: 0.9, tat: 1.8 },
  { name: 'Home decor', share: 0.06, st: 0.36, tat: 2.2 },
  { name: 'Mobile accessories', share: 0.12, st: 0.55, tat: 1.9 },
];

// ---------------------------------------------------------------- seeded generation
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (str) => [...str].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const MONTHS = [[0, 31], [31, 30], [61, 20]]; // [startIdx, days] for Aug, Sep, Oct (to 20th)

// distribute an integer total over weights so the parts sum exactly (largest remainder)
function spread(total, w) {
  const sum = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (total * x) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
  return out;
}

const RTO_F = [(1 / 1.12) * (31 / 30), 1, 1.03 * (20 / 31)];
const E_F = [0.95, 1, 1.02];
const P_F = [0.97, 1, 1.01];
const S_F = [0.95, 1, 1.03];
const PP_F = [0.95, 1, 1.01];
const T_F = [1.08, 1, 0.97];

function build(l) {
  const r = rng(hash(l.id));
  const phase = r() * 7;
  const base = Array.from({ length: DAYS }, (_, d) => (1 + 0.13 * Math.sin((2 * Math.PI * d) / 7 + phase)) * (0.9 + 0.2 * r()));
  const out = { rto: [], elig: [], pushed: [], sold: [], prepaid: [], tatSum: [] };
  MONTHS.forEach(([s0, n], m) => {
    const w = base.slice(s0, s0 + n);
    const ramp = w.map((x, i) => x * (0.88 + (0.24 * i) / (n - 1)));
    const rto = Math.round(l.rto * RTO_F[m]);
    const ex = m === 1 && l.exact;
    const elig = ex ? ex.elig : Math.round(rto * l.e * E_F[m]);
    const pushed = ex ? ex.pushed : Math.round(elig * l.push * P_F[m]);
    const sold = ex ? ex.sold : Math.min(pushed, Math.round(elig * l.s * S_F[m]));
    const prepaid = Math.round(sold * Math.min(0.97, l.p * PP_F[m]));
    out.rto.push(...spread(rto, w));
    out.elig.push(...spread(elig, w));
    out.pushed.push(...spread(pushed, w));
    const sd = spread(sold, ramp);
    out.sold.push(...sd);
    out.prepaid.push(...spread(prepaid, ramp));
    out.tatSum.push(...sd.map((x) => x * l.tat * T_F[m] * (0.95 + 0.1 * r())));
  });
  return out;
}
const SERIES = Object.fromEntries(LMDCS.map((l) => [l.id, build(l)]));

// ---------------------------------------------------------------- dates and periods
export const dayDate = (i) => new Date(START + i * DAY);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (i, year = true) => { const d = dayDate(i); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}${year ? ' ' + d.getUTCFullYear() : ''}`; };
export const isoOf = (i) => dayDate(i).toISOString().slice(0, 10);
export const idxOf = (iso) => Math.round((Date.parse(iso + 'T00:00:00Z') - START) / DAY);

export const PERIODS = [
  { id: 'sep-2026', label: '1 Sep 2026 – 30 Sep 2026', range: [31, 60], cmp: 'vs last month' },
  { id: 'oct-2026', label: '1 Oct 2026 – 20 Oct 2026 (month to date)', range: [61, 80], cmp: 'vs same days last month' },
  { id: 'aug-2026', label: '1 Aug 2026 – 31 Aug 2026', range: [0, 30], cmp: 'vs last month' },
  { id: 'last7', label: 'Last 7 days (14 – 20 Oct)', range: [74, 80], cmp: 'vs previous 7 days' },
  { id: 'last30', label: 'Last 30 days (21 Sep – 20 Oct)', range: [51, 80], cmp: 'vs previous 30 days' },
];
export function resolvePeriod(id, from, to) {
  if (id === 'custom') {
    let a = Math.max(0, Math.min(DAYS - 1, idxOf(from || '2026-09-01')));
    let b = Math.max(0, Math.min(DAYS - 1, idxOf(to || '2026-09-30')));
    if (Number.isNaN(a) || Number.isNaN(b)) { a = 31; b = 60; }
    if (a > b) [a, b] = [b, a];
    return { id, label: `${fmtDate(a)} – ${fmtDate(b)}`, range: [a, b], cmp: 'vs previous period', prev: prevOf([a, b]) };
  }
  const p = PERIODS.find((x) => x.id === id) || PERIODS[0];
  const prev = p.id === 'sep-2026' ? [0, 29] : p.id === 'oct-2026' ? [31, 50] : prevOf(p.range);
  return { ...p, prev };
}
function prevOf([a, b]) {
  const n = b - a + 1;
  return a - n < 0 ? null : [a - n, a - 1];
}

// ---------------------------------------------------------------- locations
export function resolveLoc(loc) {
  if (!loc || loc === 'all') return { id: 'all', label: 'All India', short: 'All India', ids: LMDCS.map((l) => l.id), level: 'all' };
  if (loc.startsWith('r:')) {
    const r = regionById(loc.slice(2));
    if (r) return { id: loc, label: `${r.name} · all LMDCs`, short: r.name, ids: LMDCS.filter((l) => l.region === r.id).map((l) => l.id), level: 'region', region: r };
  }
  const l = lmdcById(loc);
  if (l) return { id: l.id, label: `${regionById(l.region).name} – ${l.name}`, short: l.name, ids: [l.id], level: 'lmdc', lmdc: l, region: regionById(l.region) };
  return resolveLoc('all');
}

// ---------------------------------------------------------------- aggregation
const sumRange = (arr, [a, b]) => { let s = 0; for (let i = a; i <= b; i++) s += arr[i]; return s; };

export function metrics(ids, range) {
  if (!range) return null;
  const t = { rto: 0, elig: 0, pushed: 0, sold: 0, prepaid: 0, tatSum: 0 };
  ids.forEach((id) => Object.keys(t).forEach((k) => { t[k] += sumRange(SERIES[id][k], range); }));
  return {
    ...t,
    eligPct: t.rto ? t.elig / t.rto : 0,
    pushPct: t.rto ? t.pushed / t.rto : 0,
    soldPct: t.elig ? t.sold / t.elig : 0,
    soldOfRto: t.rto ? t.sold / t.rto : 0,
    prepaidPct: t.sold ? t.prepaid / t.sold : 0,
    tat: t.sold ? t.tatSum / t.sold : 0,
    saved: t.sold * REVERSE_COST,
  };
}

/** Cumulative sell-through (sold ÷ eligible since the period start), per week or per day for short ranges. */
export function trend(ids, [a, b]) {
  const n = b - a + 1;
  const step = n <= 10 ? 1 : 7;
  const pts = [];
  for (let s = a; s <= b; s += step) {
    const e = Math.min(b, s + step - 1);
    if (step === 7 && e - s < 3 && pts.length) { // fold a short tail into the last bucket
      const last = pts[pts.length - 1];
      const m = metrics(ids, [a, e]);
      Object.assign(last, { e, v: m.soldPct, sold: m.sold, elig: m.elig, label: last.label });
      break;
    }
    const m = metrics(ids, [a, e]); // cumulative from the start of the period
    pts.push({ a: s, e, v: m.soldPct, sold: m.sold, elig: m.elig, label: step === 1 ? fmtDate(s, false) : `Week ${pts.length + 1}` });
  }
  return pts;
}

/** Current hold inventory and ageing (as of today, 20 Oct). */
export function inventory(ids) {
  const out = { units: 0, cap: 0, buckets: [0, 0, 0, 0], perLmdc: [] };
  ids.forEach((id) => {
    const l = lmdcById(id);
    const recentElig = sumRange(SERIES[id].elig, [DAYS - 30, DAYS - 1]);
    const units = id === 'okhla' ? 2240 : Math.round(recentElig * 0.25);
    const k = Math.max(0, 0.75 - l.s);
    const sh = id === 'okhla' ? [0.60, 0.25, 0.10, 0.05] : [0.60 - k * 0.7, 0.25, 0.10 + k * 0.35, 0.05 + k * 0.35];
    const tot = sh.reduce((x, y) => x + y, 0);
    const b = spread(units, sh.map((x) => x / tot));
    out.units += units; out.cap += l.cap;
    b.forEach((x, i) => { out.buckets[i] += x; });
    out.perLmdc.push({ l, units, buckets: b, util: units / l.cap });
  });
  return out;
}
export const AGE_BUCKETS = [
  ['Available (0–7 days)', '#22a06b'],
  ['Ageing (8–14 days)', '#f5b740'],
  ['Ageing (15–21 days)', '#ef8b3a'],
  ['> 21 days (Action)', '#e5484d'],
];

/** Category-level performance for a location and period. */
export function categories(ids, range) {
  const m = metrics(ids, range);
  const r = rng(hash(ids.join(',') + range.join('-')));
  const rows = CATEGORIES.map((c) => {
    const rto = Math.round(m.rto * c.share * (0.92 + 0.16 * r()));
    const eligShare = c.name === 'Mobile accessories' ? 0.42 : c.name === 'Home decor' ? 0.55 : Math.min(0.92, m.eligPct * (0.95 + 0.1 * r()));
    const elig = Math.round(rto * eligShare);
    const st = Math.min(0.95, m.soldPct * c.st * (0.96 + 0.08 * r()));
    return { name: c.name, rto, elig, sold: Math.round(elig * st), st, tat: +(c.tat * (m.tat / 1.8)).toFixed(1) };
  });
  const k = m.sold / Math.max(1, rows.reduce((a, x) => a + x.sold, 0));
  rows.forEach((x) => { x.sold = Math.min(x.elig, Math.round(x.sold * k)); x.st = x.elig ? x.sold / x.elig : 0; });
  return rows;
}

/** Per-LMDC rows for a set of LMDCs. */
export function lmdcRows(ids, range, prev) {
  return ids.map((id) => {
    const l = lmdcById(id);
    const m = metrics([id], range);
    const pm = prev ? metrics([id], prev) : null;
    return { l, region: regionById(l.region), m, pm };
  });
}

// ---------------------------------------------------------------- alerts
export const DEFAULT_SETTINGS = { minSellThrough: 0.26, maxQc: 0.045, maxTat: 2.25, maxShelf: 0.9, maxOverdue: 100 };

export function alerts(settings = DEFAULT_SETTINGS) {
  const out = [];
  const range = [51, 80];
  LMDCS.forEach((l) => {
    const inv = inventory([l.id]).perLmdc[0];
    const m = metrics([l.id], [74, 80]);
    const reg = regionById(l.region).name;
    if (inv.buckets[3] > settings.maxOverdue) out.push({ id: `age-${l.id}`, lmdc: l.id, sev: 'high', kind: 'Ageing', title: `Ageing inventory past 21 days (${inv.buckets[3]} units)`, where: `${reg} – ${l.name}`, action: 'Take action', detail: `Move ${inv.buckets[3]} units on the RTO line-haul today so none crosses the 45-day lost-shipment rule.` });
    if (m.tat > settings.maxTat) out.push({ id: `tat-${l.id}`, lmdc: l.id, sev: 'med', kind: 'Delivery TAT', title: `Delivery TAT increase (${m.tat.toFixed(1)} days)`, where: `${reg} – ${l.name}`, action: 'Raise allocation', detail: 'Add a rider slot on the LMDC → LMSC shuttle for Quick orders until TAT is back under target.' });
    if (l.qc > settings.maxQc) out.push({ id: `qc-${l.id}`, lmdc: l.id, sev: 'med', kind: 'QC', title: `High QC rejection rate (${(l.qc * 100).toFixed(0)}%)`, where: `${reg} – ${l.name}`, action: 'Check partner process', detail: 'Audit how riders hand back failed parcels (seal, label, packaging) with the delivery partner.' });
    if (inv.util > settings.maxShelf) out.push({ id: `shelf-${l.id}`, lmdc: l.id, sev: 'med', kind: 'Capacity', title: `Hold shelf at ${Math.round(inv.util * 100)}% capacity`, where: `${reg} – ${l.name}`, action: 'Tighten stock cap', detail: 'Lower the per-SKU stock cap for slow categories so new high-demand units still fit.' });
    categories([l.id], range).forEach((c) => {
      if (c.st < settings.minSellThrough && c.elig > 40) out.push({ id: `st-${l.id}-${c.name}`, lmdc: l.id, sev: 'low', kind: 'Sell-through', title: `Low sell-through (${Math.round(c.st * 100)}%) – ${c.name}`, where: `${reg} – ${l.name}`, action: 'Create SKU mix', detail: `Stop retaining ${c.name.toLowerCase()} below a 30% predicted resale chance at this LMDC; send them straight to RTO.` });
    });
  });
  const rank = { high: 0, med: 1, low: 2 };
  return out.sort((a, b) => rank[a.sev] - rank[b.sev]);
}

// ---------------------------------------------------------------- sample orders
const AREAS = { ncr: ['Saket', 'Lajpat Nagar', 'Kalkaji', 'Sector 18', 'Indirapuram', 'DLF Phase 3', 'NIT', 'Sector 10'], mum: ['Andheri E', 'Powai', 'Vashi', 'Ghatkopar', 'Thane W'], blr: ['Whitefield', 'HSR Layout', 'Marathahalli', 'BTM'], hyd: ['Gachibowli', 'Kondapur', 'Madhapur'], kol: ['Salt Lake', 'New Town', 'Dum Dum'], jpr: ['Malviya Nagar', 'Mansarovar', 'Sanganer'] };
const STATUSES = ['Delivered', 'Delivered', 'Delivered', 'Delivered', 'Out for delivery', 'Packed', 'Placed', 'Cancelled'];
export function orders(ids, [a, b], limit = 60) {
  const res = [];
  const r = rng(hash('o' + ids.join(',') + a + '-' + b));
  const total = metrics(ids, [a, b]).sold;
  for (let i = 0; i < Math.min(limit, total); i++) {
    const id = ids[Math.floor(r() * ids.length)];
    const l = lmdcById(id);
    const day = b - Math.floor((i / limit) * Math.min(6, b - a + 1));
    const c = CATEGORIES[Math.floor(r() * 10)];
    const st = day >= DAYS - 2 ? STATUSES[4 + Math.floor(r() * 4)] : STATUSES[Math.floor(r() * 5)] === 'Out for delivery' ? 'Delivered' : STATUSES[Math.floor(r() * 4)];
    const pre = r() < l.p;
    res.push({
      id: 'MQ' + (480000 + hash(id + i + a) % 99999), lmdc: l, cat: c.name, area: AREAS[l.region][Math.floor(r() * AREAS[l.region].length)],
      km: Math.round(3 + r() * 45), value: Math.round(199 + r() * 600), pay: pre ? 'Prepaid' : 'COD', day, hour: 8 + Math.floor(r() * 13), min: Math.floor(r() * 60),
      tat: st === 'Delivered' ? +(l.tat * (0.7 + 0.6 * r())).toFixed(1) : null, status: st,
    });
  }
  return { rows: res, total };
}

// ---------------------------------------------------------------- formatting
export const fmt = (n) => Math.round(n).toLocaleString('en-IN');
export const pct = (x, d = 0) => (x * 100).toFixed(d) + '%';
export const lakh = (n) => (n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? '₹' + (n / 1e5).toFixed(1) + ' Lakh' : '₹' + fmt(n));
export const delta = (cur, prev) => (prev ? (cur - prev) / prev : null);
