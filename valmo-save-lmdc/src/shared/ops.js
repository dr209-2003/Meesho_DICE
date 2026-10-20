// Meesho Quick × Valmo-SAVE — the single source of truth for retained inventory and Quick orders.
// Pure functions: the same code runs in the Vercel function (shared mode) and in the browser
// (local demo mode), so both modes enforce identical rules.
import { SKUS } from '../data/skus.js';
import { decide } from '../lib/engine.js';
import { HOLD_DAYS, QUICK_HUB, RADIUS_KM, productById } from './catalog.js';

const DAY = 86400000;
const MAX_QTY = 5;
const MAX_ORDERS = 400;
const MAX_LOG = 80;

export class OpError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const RACKS = { 'MS-KR-20431': 'R-4-03', 'MS-BD-11872': 'R-4-07', 'MS-BT-30915': 'R-4-11', 'MS-KD-07718': 'R-4-14', 'MS-AC-55120': 'R-4-18', 'MS-HG-40266': 'R-4-21', 'MS-EL-62004': 'R-4-24', 'MS-KT-18450': 'R-4-26', 'MS-DC-09333': 'R-4-29', 'MS-MB-71209': 'R-4-31' };

// Units already on the hold shelf when the demo starts (matches the dashboard's shelf counts).
const SEED = [
  ['MS-KR-20431', 'M', 2], ['MS-KR-20431', 'M', 5], ['MS-KR-20431', 'L', 3], ['MS-KR-20431', 'L', 8], ['MS-KR-20431', 'M', 11],
  ['MS-BD-11872', 'Floral blue', 1], ['MS-BD-11872', 'Floral blue', 4], ['MS-BD-11872', 'Floral pink', 6], ['MS-BD-11872', 'Floral blue', 9],
  ['MS-BT-30915', '30 ml', 2], ['MS-BT-30915', '30 ml', 7], ['MS-BT-30915', '30 ml', 12],
  ['MS-KD-07718', '4–5 y', 3], ['MS-KD-07718', '6–7 y', 10],
  ['MS-AC-55120', 'Black dial', 4], ['MS-AC-55120', 'Black dial', 13],
  ['MS-HG-40266', 'White matte', 5],
  ['MS-EL-62004', 'Black', 6],
  ['MS-DC-09333', 'Walnut', 9],
];

export function seed(now = Date.now()) {
  const units = SEED.map(([skuId, variant, age], i) => {
    const retainedAt = now - age * DAY - (i % 5) * 3600000;
    return {
      id: 'U-' + (1001 + i), skuId, variant, lmdc: QUICK_HUB.id, rack: RACKS[skuId],
      awb: 'VL77' + String(31000 + i * 37).padStart(5, '0'),
      status: 'live', retainedAt, listedAt: retainedAt + 3 * 3600000, holdUntil: retainedAt + HOLD_DAYS * DAY,
      qc: { packaging: true, label: true, matches: true }, orderId: null,
    };
  });
  return { schema: 1, rev: 0, seededAt: now, nextUnit: 1001 + units.length, nextOrder: 240101, units, orders: [], log: [] };
}

/** Expire live units past their hold limit (they go back to the seller). Pure. */
export function normalize(s, now = Date.now()) {
  let changed = false;
  const log = [];
  const units = s.units.map((u) => {
    if ((u.status === 'live' || u.status === 'qc') && u.holdUntil <= now) {
      changed = true;
      log.push({ t: now, kind: 'RTO', text: `${u.id} (${shortName(u.skuId)}, ${u.variant}) reached its ${HOLD_DAYS}-day hold limit and returns to the seller.` });
      return { ...u, status: 'rto', rtoReason: 'Hold limit reached' };
    }
    return u;
  });
  return changed ? { ...s, units, log: [...log, ...s.log].slice(0, MAX_LOG) } : s;
}

const shortName = (skuId) => productById(skuId)?.short || skuId;

/** Units a customer can buy right now, keyed "skuId|variant". */
export function availability(s, now = Date.now()) {
  const out = {};
  for (const u of s.units) {
    if (u.status === 'live' && u.holdUntil > now) {
      const k = u.skuId + '|' + u.variant;
      out[k] = (out[k] || 0) + 1;
    }
  }
  return out;
}
export const availableFor = (avail, skuId, variant) =>
  variant ? avail[skuId + '|' + variant] || 0 : Object.entries(avail).reduce((n, [k, v]) => (k.startsWith(skuId + '|') ? n + v : n), 0);

/** Engine eligibility for retaining one more unit of a SKU at this hub. */
export function eligibility(s, skuId) {
  const sku = SKUS.find((x) => x.id === skuId);
  if (!sku) return { ok: false, reason: 'Unknown SKU' };
  const d = decide(sku);
  const held = s.units.filter((u) => u.skuId === skuId && ['qc', 'live', 'reserved'].includes(u.status)).length;
  if (!d.hold) return { ok: false, reason: `Engine says return to origin: resale chance ${Math.round(d.F[21] * 100)}% in 21 days`, held, cap: 0, d };
  if (held >= d.cap) return { ok: false, reason: `Stock cap reached: ${held} of ${d.cap} units already held`, held, cap: d.cap, d };
  return { ok: true, reason: `Hold up to ${d.Ts} days · ${Math.round(d.p * 100)}% resale chance`, held, cap: d.cap, d };
}

const FLOW = ['placed', 'packed', 'dispatched', 'delivered'];
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const maskPhone = (p) => (p.length >= 10 ? p.slice(0, 2) + '••••••' + p.slice(-2) : '••••');

/**
 * Apply one operation. Returns { state, result }. Throws OpError on invalid input,
 * leaving the input state untouched (all-or-nothing).
 */
export function applyOp(input, op, now = Date.now()) {
  let s = { ...normalize(input, now) };
  const log = (kind, text) => { s.log = [{ t: now, kind, text }, ...s.log].slice(0, MAX_LOG); };
  if (!op || typeof op.type !== 'string') throw new OpError('BAD_OP', 'Missing operation');

  switch (op.type) {
    case 'retain': {
      const p = productById(op.skuId);
      if (!p) throw new OpError('BAD_SKU', 'Unknown product');
      if (!p.options.includes(op.variant)) throw new OpError('BAD_VARIANT', 'Unknown variant');
      const el = eligibility(s, op.skuId);
      if (!el.ok) throw new OpError('NOT_ELIGIBLE', el.reason);
      const id = 'U-' + s.nextUnit;
      const unit = {
        id, skuId: op.skuId, variant: op.variant, lmdc: QUICK_HUB.id, rack: RACKS[op.skuId],
        awb: 'VL77' + String(40000 + s.nextUnit).padStart(5, '0'), status: 'qc', retainedAt: now, listedAt: null,
        holdUntil: now + Math.min(HOLD_DAYS, Number(op.ruleDaysLeft) || HOLD_DAYS) * DAY, qc: null, orderId: null,
      };
      s = { ...s, nextUnit: s.nextUnit + 1, units: [...s.units, unit] };
      log('Retain', `${id} · ${p.short} (${op.variant}) retained at ${QUICK_HUB.id} and sent to QC.`);
      return { state: s, result: { unitId: id } };
    }

    case 'qc': {
      const u = s.units.find((x) => x.id === op.unitId);
      if (!u || u.status !== 'qc') throw new OpError('BAD_UNIT', 'Unit is not waiting for QC');
      const checks = { packaging: !!op.checks?.packaging, label: !!op.checks?.label, matches: !!op.checks?.matches };
      const pass = checks.packaging && checks.label && checks.matches;
      s = { ...s, units: s.units.map((x) => (x.id === u.id ? { ...x, qc: checks, status: pass ? 'live' : 'rto', listedAt: pass ? now : null, rtoReason: pass ? undefined : 'Failed QC' } : x)) };
      log(pass ? 'Listed' : 'RTO', pass
        ? `${u.id} · ${shortName(u.skuId)} (${u.variant}) passed QC and is live on Meesho Quick within ${RADIUS_KM} km.`
        : `${u.id} · ${shortName(u.skuId)} failed QC and goes back to the seller.`);
      return { state: s, result: { live: pass } };
    }

    case 'placeOrder': {
      const items = Array.isArray(op.items) ? op.items.slice(0, 20) : [];
      if (!items.length) throw new OpError('EMPTY', 'Your cart is empty');
      const a = op.address || {};
      const address = { name: str(a.name, 60), phone: maskPhone(str(a.phone, 15).replace(/\D/g, '')), line: str(a.line, 120), area: str(a.area, 60), city: str(a.city, 40), pin: str(a.pin, 6), km: Number(a.km) };
      if (!address.name || !address.line || !/^\d{6}$/.test(address.pin) || !Number.isFinite(address.km)) throw new OpError('BAD_ADDRESS', 'Please complete the delivery address');
      const customerId = str(op.customerId, 40);
      if (!customerId) throw new OpError('BAD_CUSTOMER', 'Missing customer');
      const method = op.payment === 'prepaid' ? 'prepaid' : 'cod';

      // validate every line before touching stock
      const lines = items.map((it) => {
        const p = productById(it.skuId);
        const qty = Math.floor(Number(it.qty));
        if (!p || !p.options.includes(it.variant) || !(qty >= 1 && qty <= MAX_QTY)) throw new OpError('BAD_ITEM', 'An item in your cart is invalid');
        return { skuId: p.id, variant: it.variant, qty, mode: it.mode === 'quick' ? 'quick' : 'regular', price: p.price };
      });
      if (lines.some((l) => l.mode === 'quick') && address.km > RADIUS_KM) throw new OpError('OUT_OF_ZONE', `Meesho Quick delivers within ${RADIUS_KM} km of the hub only`);

      // reserve units for Quick lines: oldest hold deadline first, all or nothing
      const units = s.units.map((u) => ({ ...u }));
      const short = [];
      for (const l of lines.filter((x) => x.mode === 'quick')) {
        const pool = units.filter((u) => u.skuId === l.skuId && u.variant === l.variant && u.status === 'live' && u.holdUntil > now).sort((x, y) => x.holdUntil - y.holdUntil);
        if (pool.length < l.qty) short.push({ skuId: l.skuId, variant: l.variant, wanted: l.qty, available: pool.length });
        else l.units = pool.slice(0, l.qty).map((u) => { u.status = 'reserved'; return u.id; });
      }
      if (short.length) throw new OpError('OUT_OF_STOCK', 'Some items just sold out near you', short);

      const created = [];
      let next = s.nextOrder;
      for (const mode of ['quick', 'regular']) {
        const ls = lines.filter((l) => l.mode === mode);
        if (!ls.length) continue;
        const id = (mode === 'quick' ? 'MQ' : 'MS') + next++;
        ls.forEach((l) => l.units?.forEach((uid) => { units.find((u) => u.id === uid).orderId = id; }));
        const total = ls.reduce((n, l) => n + l.price * l.qty, 0);
        created.push({
          id, mode, customerId, createdAt: now, items: ls, total, address,
          payment: { method, status: method === 'prepaid' ? 'Paid · simulated' : 'Cash on delivery' },
          status: 'placed', timeline: { placed: now },
          eta: mode === 'quick' ? now + DAY : now + 6 * DAY,
          lmdc: mode === 'quick' ? QUICK_HUB.id : null,
        });
      }
      s = { ...s, units, nextOrder: next, orders: [...created, ...s.orders].slice(0, MAX_ORDERS) };
      created.forEach((o) => log('Order', o.mode === 'quick'
        ? `${o.id}: ${o.items.map((l) => `${l.qty}× ${shortName(l.skuId)} (${l.variant})`).join(', ')} reserved for ${o.address.area} (${o.address.km} km) · ${o.payment.method === 'prepaid' ? 'prepaid' : 'COD'} ₹${o.total}.`
        : `${o.id}: regular seller order for ${o.address.area} (not from hub stock).`));
      return { state: s, result: { orderIds: created.map((o) => o.id) } };
    }

    case 'advanceOrder': {
      const o = s.orders.find((x) => x.id === op.orderId);
      if (!o || !FLOW.includes(o.status) || o.status === 'delivered') throw new OpError('BAD_ORDER', 'This order cannot move forward');
      const next = FLOW[FLOW.indexOf(o.status) + 1];
      const unitIds = o.items.flatMap((l) => l.units || []);
      s = {
        ...s,
        orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: next, timeline: { ...x.timeline, [next]: now } } : x)),
        units: next === 'delivered' ? s.units.map((u) => (unitIds.includes(u.id) ? { ...u, status: 'sold', soldAt: now } : u)) : s.units,
      };
      log('Order', `${o.id} marked ${next}.`);
      return { state: s, result: { status: next } };
    }

    case 'cancelOrder': {
      const o = s.orders.find((x) => x.id === op.orderId);
      if (!o || !['placed', 'packed'].includes(o.status)) throw new OpError('BAD_ORDER', 'This order can no longer be cancelled');
      if (op.customerId && o.customerId !== op.customerId) throw new OpError('FORBIDDEN', 'Not your order');
      const unitIds = o.items.flatMap((l) => l.units || []);
      s = {
        ...s,
        orders: s.orders.map((x) => (x.id === o.id ? { ...x, status: 'cancelled', timeline: { ...x.timeline, cancelled: now } } : x)),
        units: s.units.map((u) => (unitIds.includes(u.id) ? { ...u, status: u.holdUntil > now ? 'live' : 'rto', orderId: null } : u)),
      };
      log('Order', `${o.id} cancelled · ${unitIds.length} unit(s) released back to Quick stock.`);
      return { state: s, result: { released: unitIds.length } };
    }

    case 'reset':
      return { state: { ...seed(now), rev: input.rev }, result: { reset: true } };

    default:
      throw new OpError('BAD_OP', 'Unknown operation');
  }
}

export const OPS = ['retain', 'qc', 'placeOrder', 'advanceOrder', 'cancelOrder', 'reset'];
