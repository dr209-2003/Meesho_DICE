/**
 * Valmo-SAVE decision engine (v2.2 policy) — browser port.
 *
 * A failed-delivery unit at the LMDC can be returned to the seller (RTO, ₹170 =
 * ₹50 sunk forward leg + ₹120 reverse) or held on the hub shelf and resold to a
 * new buyer within 70 km.
 *
 *   demand within 70 km      ~ Gamma–Poisson  → negative-binomial predictive
 *   P(sold by day t)          = 1 − (1 + λ t / k)^(−k)
 *   expected cost of holding  E[C](T) = 75 + 0.333 · E[shelf-days] + 120 · (1 − P(T))
 *   decision                  HOLD iff min_T E[C](T) < 170, with T ≤ 21 days
 *   stock cap                 the n-th unit is held only while its own
 *                             (n-th order) curve still beats ₹170
 */
export const POLICY = {
  radiusKm: 70,
  capDays: 21,
  rtoCost: 170,
  forward: 50,
  reverse: 120,
  holdFixed: 25,
  holdPerDay: 10 / 30,
  ruleDays: 45,
};

const { capDays: CAP, holdPerDay: PER_DAY, rtoCost: RTO } = POLICY;

/** P(at least one order by day t), t = 0..cap */
export function resaleCurve(lambda, k, cap = CAP) {
  const F = [];
  for (let t = 0; t <= cap; t++) F.push(1 - Math.pow(1 + (lambda * t) / k, -k));
  return F;
}

/** P(at least n orders by day t) — used for the n-th unit on the shelf */
export function unitCurve(lambda, k, n, cap = CAP) {
  const F = [0];
  for (let t = 1; t <= cap; t++) {
    const p = k / (k + lambda * t);
    let pj = Math.pow(p, k);
    let cdf = 0;
    for (let j = 0; j < n; j++) {
      cdf += pj;
      pj = (pj * (j + k)) / (j + 1) * (1 - p);
    }
    F.push(Math.max(0, 1 - cdf));
  }
  return F;
}

export const shelfDays = (F, T) => {
  let s = 0;
  for (let t = 0; t < T; t++) s += 1 - F[t];
  return s;
};

export const expectedCost = (F, T) =>
  T === 0 ? RTO : POLICY.forward + POLICY.holdFixed + PER_DAY * shelfDays(F, T) + POLICY.reverse * (1 - F[T]);

/** chance of resale needed for holding to pay off by day t */
export const requiredChance = (F, t) => (POLICY.holdFixed + PER_DAY * shelfDays(F, t)) / POLICY.reverse;

/**
 * Full decision for one SKU.
 * @param {{lambda:number,k:number,failed:number,shelf:number}} s
 * @param {number} [maxDays] optional override of the hold limit (≤ 21)
 */
export function decide(s, maxDays = CAP) {
  const F = resaleCurve(s.lambda, s.k);
  const C = F.map((_, T) => expectedCost(F, T));
  let Ts = 0;
  for (let T = 0; T <= maxDays; T++) if (C[T] < C[Ts]) Ts = T;
  const hold = C[Ts] < RTO;

  let breakEven = 0;
  for (let T = 1; T <= CAP; T++) if (C[T] < RTO) { breakEven = T; break; }
  let median = 0;
  for (let T = 1; T <= CAP; T++) if (F[T] >= 0.5) { median = T; break; }

  let cap = 0;
  if (hold) {
    for (let n = 1; n <= 40; n++) {
      const G = unitCurve(s.lambda, s.k, n);
      let best = RTO;
      for (let T = 1; T <= maxDays; T++) best = Math.min(best, expectedCost(G, T));
      if (best < RTO) cap = n;
      else break;
    }
  }
  const retain = hold ? Math.max(0, Math.min(s.failed, cap - s.shelf)) : 0;
  const p = hold ? F[Ts] : F[CAP];
  return {
    F, C, Ts, hold, breakEven, median, cap, retain,
    rto: s.failed - retain,
    p,
    cost: hold ? C[Ts] : RTO,
    saving: hold ? RTO - C[Ts] : 0,
    req: F.map((_, t) => (t === 0 ? null : requiredChance(F, t))),
    orders30: Math.round(s.lambda * 30),
    decision: !hold ? 'RTO' : retain === 0 ? 'CAP FULL' : 'RETAIN',
  };
}

export const chanceColor = (p) =>
  p >= 0.8 ? 'var(--teal)' : p >= 0.6 ? 'var(--blue)' : p >= 0.3 ? 'var(--amber)' : 'var(--orange)';

export const DECISION_STYLE = {
  RETAIN: { background: 'var(--teal-t)', color: '#0b5e54' },
  'CAP FULL': { background: 'var(--violet-t)', color: '#4a23a3' },
  RTO: { background: 'var(--orange-t)', color: '#8a3610' },
};
