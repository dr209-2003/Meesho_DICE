import { FEATURED } from '../data/dispatch';

const BASE = new Date(2026, 9, 4); // 04 Oct 2026
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayLabel = (offset) => {
  const d = new Date(BASE);
  d.setDate(d.getDate() + offset);
  return String(d.getDate()).padStart(2, '0') + ' ' + MONTHS[d.getMonth()];
};

const REASONS = ['Refused (COD)', 'Customer not available', 'Wrong address', 'Cash not ready (COD)', 'Asked to reschedule'];
const awb = (seed, i) => `VL77${31000 + ((seed * 97 + i * 53) % 9000)}-0${100 + ((seed * 31 + i * 29) % 900)}`;

export const STATUS = {
  sent: { label: 'Sent → LMSC', bg: 'var(--green)', fg: '#fff' },
  loading: { label: 'Loading → shuttle', bg: 'var(--amber)', fg: '#353543' },
  pick: { label: 'Re-sold · to pick', bg: 'var(--rose)', fg: '#fff' },
  next: { label: 'Next in line', bg: 'var(--violet-t)', fg: '#4a23a3' },
  waiting: { label: 'Waiting', bg: 'var(--blue-t)', fg: '#2648a6' },
  today: { label: 'Retained today', bg: 'var(--teal-t)', fg: '#0b5e54' },
  rto: { label: 'RTO · today', bg: 'var(--orange-t)', fg: '#8a3610' },
  returning: { label: 'Returning to seller', bg: 'var(--orange-t)', fg: '#8a3610' },
};

/**
 * Units of a SKU at the hub: older units on the shelf, today's retained units, today's RTO units.
 * @returns {Array<{awb,reason,failedOn,days,returnBy,rack,status,highlight}>}
 */
export function buildUnits(sku, d, dispatch, returned) {
  const seed = sku.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const feat = FEATURED.find((f) => f.skuId === sku.id);
  const rows = [];

  if (sku.id === 'MS-KR-20431') {
    rows.push({ awb: 'VL7731350-0118', reason: 'Asked to reschedule', off: -2, status: dispatch['u-kurta'] || 'sent', highlight: true });
    rows.push({ awb: 'VL7731357-0264', reason: 'Refused (COD)', off: -2, status: 'next' });
    [['VL7731602-0340', 'Cash not ready (COD)'], ['VL7731611-0351', 'Customer not available'], ['VL7731640-0372', 'Wrong address'], ['VL7731655-0389', 'Refused (COD)']]
      .forEach(([a, r]) => rows.push({ awb: a, reason: r, off: -1, status: 'waiting' }));
    rows.push({ awb: 'VL7731905-0412', reason: 'Refused (COD)', off: 0, status: 'today' });
    rows.push({ awb: 'VL7731911-0077', reason: 'Customer not available', off: 0, status: 'today' });
    for (let i = 2; i < d.retain; i++) rows.push({ awb: awb(seed, i + 20), reason: REASONS[i % 5], off: 0, status: 'today' });
  } else {
    const offs = [-2, -3, -5, -6, -8, -9, -11, -12];
    for (let i = 0; i < sku.shelf; i++) {
      if (i === 0 && feat) rows.push({ awb: feat.awb, reason: REASONS[(seed + 4) % 5], off: -2, status: dispatch[feat.id] || feat.initial, highlight: true });
      else rows.push({ awb: awb(seed, i), reason: REASONS[(seed + i) % 5], off: offs[i], status: (feat ? i === 1 : i === 0) ? 'next' : 'waiting' });
    }
    rows.sort((a, b) => a.off - b.off);
    for (let i = 0; i < d.retain; i++) rows.push({ awb: awb(seed, i + 20), reason: REASONS[(seed + i + 2) % 5], off: 0, status: 'today' });
  }
  for (let i = 0; i < d.rto; i++) rows.push({ awb: awb(seed, i + 60), reason: REASONS[(seed + i + 1) % 5], off: 0, status: 'rto', rto: true });

  return rows.map((r) => {
    const status = returned && !r.rto && !['sent', 'loading', 'pick'].includes(r.status) ? 'returning' : r.status;
    return {
      ...r,
      failedOn: dayLabel(r.off),
      days: -r.off,
      returnBy: r.rto ? '—' : dayLabel(r.off + 21),
      rack: r.rto ? 'RTO dock D-4' : sku.rack + (r.off === 0 ? '-B' : '-A'),
      status,
    };
  });
}

/** Buyer of the failed order and (if re-sold) the new buyer for the unit shown on the SKU page */
export function buyersFor(sku) {
  const feat = FEATURED.find((f) => f.skuId === sku.id);
  if (sku.id === 'MS-KR-20431') {
    return {
      unit: 'VL7731350-0118',
      failed: { name: 'P•••• K.', order: 'ORD-86544', area: 'Lajpat Nagar II · 4 km', pay: 'COD ₹449 · 2 attempts', note: 'Rescheduled, then unreachable' },
      resold: { name: feat.buyer, order: feat.order, area: `${feat.area} · ${feat.km} km`, pay: `${feat.payment} · ordered ${feat.ordered}`, note: `Via ${feat.lmdc} · 05 Oct` },
    };
  }
  if (feat) {
    return {
      unit: feat.awb,
      failed: { name: 'R•••• T.', order: 'ORD-86' + (600 + sku.failed * 7), area: `${sku.zones[0][0]} · ${sku.zones[0][1]} km`, pay: `COD ₹${sku.price} · 2 attempts`, note: 'Refused at the door' },
      resold: { name: feat.buyer, order: feat.order, area: `${feat.area} · ${feat.km} km`, pay: `${feat.payment} · ordered ${feat.ordered}`, note: `Via ${feat.lmdc} · 05 Oct` },
    };
  }
  return {
    unit: 'latest unit · today',
    failed: { name: 'M•••• S.', order: 'ORD-87' + (100 + sku.failed * 13), area: `${sku.zones[0][0]} · ${sku.zones[0][1]} km`, pay: `COD ₹${sku.price} · 2 attempts`, note: 'Customer not available' },
    resold: null,
  };
}

/** Journey of the highlighted unit for this SKU */
export function journeyFor(sku, d, dispatch) {
  const feat = FEATURED.find((f) => f.skuId === sku.id);
  const C = { blue: 'var(--blue)', rose: 'var(--rose)', teal: 'var(--teal)', violet: 'var(--violet)', amber: 'var(--amber)', green: 'var(--green)', grey: '#cfcfdf' };
  if (feat) {
    const st = dispatch[feat.id] || feat.initial;
    const steps = [
      [`Original order placed (COD)`, `${dayLabel(-6)} 19:05`, C.blue],
      ['Dispatched from seller', `${dayLabel(-5)} 15:20`, C.blue],
      ['Reached LMDC-DL-07, Okhla', `${dayLabel(-3)} 09:40`, C.blue],
      ['Delivery failed (attempt 2)', `${dayLabel(-2)} 11:15`, C.rose],
      [`Valmo-SAVE: RETAIN on ${feat.rack} · return by ${dayLabel(19)}`, `${dayLabel(-2)} 18:05`, C.teal],
      [`New order ${feat.order} (${feat.area}, ${feat.km} km) matched`, `04 Oct ${feat.ordered}`, C.violet],
    ];
    if (st === 'loading' || st === 'sent') steps.push([`Picked from ${feat.rack}${feat.loadNote ? ' · at dock D-2' : ''}`, feat.id === 'u-kurta' ? '04 Oct 12:05' : feat.id === 'u-bedsheet' ? '04 Oct 13:05' : '04 Oct 13:45', C.amber]);
    if (st === 'sent') steps.push([`Loaded on shuttle ${feat.shuttle} → Delhi South LMSC`, feat.id === 'u-kurta' ? '04 Oct 12:08' : '04 Oct 13:45', C.amber]);
    if (feat.atLmsc && st === 'sent') steps.push([`Reached Delhi South LMSC · sorted to ${feat.lmdc}`, '04 Oct 13:10', C.green]);
    const nextTxt = st === 'pick' ? `Next: pick from ${feat.rack} before 14:15` : st === 'loading' ? `Next: load on ${feat.shuttle} before 14:15` : feat.atLmsc ? `Next: line-haul to ${feat.lmdc} · deliver to buyer` : `Next: shuttle departs ${feat.departs} → Delhi South LMSC`;
    steps.push([nextTxt, st === 'sent' && feat.atLmsc ? '04 Oct 15:00 → 05 Oct' : `by ${st === 'sent' ? feat.departs : '14:15'}`, C.grey]);
    return { unit: feat.awb, steps };
  }
  const retainTxt = d.decision === 'RETAIN' ? `Valmo-SAVE: RETAIN on ${sku.rack}-B · return by ${dayLabel(21)}` : d.decision === 'CAP FULL' ? 'Valmo-SAVE: stock cap full → RTO' : 'Valmo-SAVE: low local demand → RTO';
  return {
    unit: 'latest failed unit',
    steps: [
      ['Order placed (COD)', `${dayLabel(-4)} 20:10`, C.blue],
      ['Dispatched from seller', `${dayLabel(-3)} 14:40`, C.blue],
      ['Reached LMDC-DL-07, Okhla', `${dayLabel(-1)} 08:55`, C.blue],
      ['Delivery attempt 1 failed', `${dayLabel(-1)} 16:20`, C.rose],
      ['Delivery attempt 2 failed', '04 Oct 11:40', C.rose],
      [retainTxt, '04 Oct 12:10', d.decision === 'RETAIN' ? C.teal : C.amber],
      [d.decision === 'RETAIN' ? `Next: resell to a buyer within 70 km (50% by day ${d.median || '—'})` : 'Next: 18:00 line-haul to Delhi RTO hub', d.decision === 'RETAIN' ? 'expected' : '04 Oct 18:00', C.grey],
    ],
  };
}
