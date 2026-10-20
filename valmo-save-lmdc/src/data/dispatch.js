// Re-sold retained units travel LMDC → LMSC on the 2-hourly shuttle, then to the buyer's LMDC.
// Cut-off for loading = departure − 15 min.

export const SHUTTLES = [
  { id: 's1', time: '08:30', vehicle: 'VH-DS-09', units: 31 },
  { id: 's2', time: '10:30', vehicle: 'VH-DS-12', units: 32 },
  { id: 's3', time: '12:30', vehicle: 'VH-DS-09', units: 38 },
  { id: 's4', time: '14:30', vehicle: 'VH-DS-12', units: 0 },
  { id: 's5', time: '16:30', vehicle: 'VH-DS-09', units: 0 },
  { id: 's6', time: '18:30', vehicle: 'VH-DS-12', units: 0 },
];
export const CUTOFF_MIN = 15;

/** Re-sold units today that are not among the three featured ones (all already sent). */
export const OTHER_SENT = 100;
export const RESOLD_TODAY = 103;

/** The three units retained on 02 Oct (2 days ago) and ordered by new buyers today. */
export const FEATURED = [
  {
    id: 'u-kurta', skuId: 'MS-KR-20431', name: 'Rayon A-line kurta · navy, M', ini: 'KU', color: '#E8396B',
    awb: 'VL7731350-0118', rack: 'R-4-03', retainedOn: '02 Oct', order: 'ORD-88231', area: 'Dwarka Sec 10', pin: '110075', km: 25,
    buyer: 'A•••• M.', payment: 'Prepaid ₹449', ordered: '10:52', lmdc: 'LMDC-DL-14', lmdcName: 'Dwarka',
    shuttle: 'VH-DS-09', departs: '12:30', initial: 'sent', sentNote: 'Loaded 12:08 · left 12:30 · at LMSC 13:10', atLmsc: true,
  },
  {
    id: 'u-bedsheet', skuId: 'MS-BD-11872', name: 'Cotton double bedsheet + 2 covers', ini: 'BS', color: '#3D6CE0',
    awb: 'VL7731366-0054', rack: 'R-4-07', retainedOn: '02 Oct', order: 'ORD-88247', area: 'Faridabad NIT', pin: '121001', km: 20,
    buyer: 'S•••• G.', payment: 'COD ₹399', ordered: '12:41', lmdc: 'LMDC-HR-05', lmdcName: 'Faridabad',
    shuttle: 'VH-DS-12', departs: '14:30', initial: 'loading', loadNote: 'Picked 13:05 · scanned at dock D-2',
  },
  {
    id: 'u-serum', skuId: 'MS-BT-30915', name: 'Vitamin C face serum 30 ml', ini: 'SE', color: '#7B3FE4',
    awb: 'VL7731371-0129', rack: 'R-4-11', retainedOn: '02 Oct', order: 'ORD-88262', area: 'Saket', pin: '110017', km: 8,
    buyer: 'N•••• R.', payment: 'Prepaid ₹249', ordered: '13:18', lmdc: 'LMDC-DL-11', lmdcName: 'Mehrauli',
    shuttle: 'VH-DS-12', departs: '14:30', initial: 'pick',
  },
];

export const DISPATCH_STATES = {
  pick: { label: 'To pick', bg: 'var(--rose)', fg: '#fff', next: 'loading', action: 'Mark picked' },
  loading: { label: 'Loading', bg: 'var(--amber)', fg: '#353543', next: 'sent', action: 'Mark loaded' },
  sent: { label: 'Sent', bg: 'var(--green)', fg: '#fff', next: 'sent', action: 'Sent ✓' },
};
