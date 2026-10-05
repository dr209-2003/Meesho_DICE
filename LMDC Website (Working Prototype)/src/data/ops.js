// Daily operations numbers for LMDC-DL-07 (Okhla Ph-2, New Delhi) — 21 Sep → 04 Oct 2026.
// All figures are internally consistent: delivered + failed = out for delivery, reasons & zones sum to 602.

export const HUB = { id: 'LMDC-DL-07', name: 'Okhla Ph-2, New Delhi', lmsc: 'Delhi South LMSC', lead: 'Ritu S.', role: 'Shift lead' };

export const DAYS = ['21 Sep', '22 Sep', '23 Sep', '24 Sep', '25 Sep', '26 Sep', '27 Sep', '28 Sep', '29 Sep', '30 Sep', '01 Oct', '02 Oct', '03 Oct', '04 Oct'];
export const delivered = [3880, 3954, 4012, 3901, 3790, 3866, 4105, 4060, 3987, 4140, 3925, 3972, 4088, 4018];
export const failed = [590, 612, 575, 604, 640, 598, 566, 581, 609, 557, 622, 615, 588, 602];
export const retained = [205, 220, 198, 211, 229, 207, 196, 203, 214, 190, 219, 216, 206, 214];
export const outForDelivery = delivered.map((d, i) => d + failed[i]);
export const received = outForDelivery.map((o, i) => (i === 13 ? 4812 : Math.round(o / 0.96)));
export const resold = [88, 95, 91, 97, 102, 94, 99, 96, 104, 98, 101, 100, 97, 103];
export const successRate = delivered.map((d, i) => d / outForDelivery[i]);

export const TODAY = {
  received: 4812,
  outForDelivery: 4620,
  delivered: 4018,
  failed: 602,
  rto: 388,
  retained: 214,
  notDispatched: 192,
  resold: 103,
  riders: 62,
  skusFailed: 412,
  expectedResell: 103,
  expectedSaving: 5885,
  netSavingToday: 5924,
  capExpired: 111,
  resaleRate: 0.48,
};

export const SHELF = { used: 2540, slots: 3000, alertAt: 0.9, zone: 'R-4' };
export const SHELF_AGES = [
  { label: '0–3 days', short: '0–3 d', units: 980, color: 'var(--teal)' },
  { label: '4–7 days', short: '4–7 d', units: 720, color: 'var(--sky)' },
  { label: '8–14 days', short: '8–14 d', units: 560, color: 'var(--amber)' },
  { label: '15–21 days', short: '15–21 d', units: 280, color: 'var(--rose)' },
];

export const REASONS = [
  { name: 'Refused (COD)', n: 241, color: 'var(--rose)' },
  { name: 'Not available', n: 156, color: 'var(--amber)' },
  { name: 'Wrong address', n: 98, color: 'var(--violet)' },
  { name: 'Asked to reschedule', n: 64, color: 'var(--sky)' },
  { name: 'Cash not ready (COD)', n: 43, color: 'var(--teal)' },
];

export const ZONES = [
  { name: 'South Delhi', failed: 148, rto: 95, retained: 53, color: 'var(--blue)' },
  { name: 'Noida', failed: 126, rto: 81, retained: 45, color: 'var(--violet)' },
  { name: 'Gurugram', failed: 118, rto: 76, retained: 42, color: 'var(--sky)' },
  { name: 'Faridabad', failed: 112, rto: 73, retained: 39, color: 'var(--amber)' },
  { name: 'Ghaziabad', failed: 98, rto: 63, retained: 35, color: 'var(--rose)' },
];

export const CATEGORIES = [
  { name: 'Women ethnic', n: 58, color: 'var(--brand-pink)' },
  { name: 'Home & living', n: 41, color: 'var(--blue)' },
  { name: 'Beauty', n: 33, color: 'var(--violet)' },
  { name: 'Kidswear', n: 29, color: 'var(--amber)', dark: true },
  { name: 'Accessories', n: 22, color: 'var(--teal)' },
  { name: 'Electronics acc.', n: 17, color: 'var(--sky)' },
  { name: 'Others', n: 14, color: 'var(--grey)' },
];
