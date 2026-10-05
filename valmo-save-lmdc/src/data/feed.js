// Shift tasks and the notification feed. `link` makes every item clickable.

export const TASKS = [
  { id: 't-dispatch', title: 'Send re-sold units on the 14:30 shuttle → Delhi South LMSC', due: '14:15', link: '/dispatch', kind: 'urgent', derived: 'dispatch' },
  { id: 't-rto', title: 'Load RTO units on the 18:00 line-haul to Delhi RTO hub', sub: '240 / 388 loaded · dock D-4', due: '17:30', progress: 240 / 388, link: '/rto?filter=RTO', kind: 'progress' },
  { id: 't-shelve', title: 'Shelve today’s retained units in rack zone R-4', sub: '132 / 214 shelved and label-printed', due: '20:00', progress: 132 / 214, link: '/shelf', kind: 'progress' },
  { id: 't-capacity', title: 'R-4 capacity check · shelf at 85%', sub: '460 free slots · raise if above 90%', due: '16:00', link: '/shelf', kind: 'pending' },
  { id: 't-cap', title: 'Move 111 cap-expired units to the seller return bay', sub: 'Completed 11:30 · handed to RTO stream', due: '11:30', link: '/shelf', kind: 'done' },
  { id: 't-sort', title: 'Morning sort and route plan', sub: 'Completed 07:40 · 4,620 parcels on 62 routes', due: '07:40', link: '/', kind: 'done' },
  { id: 't-riders', title: 'Rider check-in and COD float issue', sub: 'Completed 08:05 · 62 / 62 riders', due: '08:05', link: '/', kind: 'done' },
  { id: 't-cod', title: 'COD cash reconciliation', sub: 'After the last rider returns', due: '21:00', link: '/', kind: 'pending' },
];

export const NOTIF_KINDS = {
  Alert: { color: 'var(--rose)', tint: 'var(--rose-t)', glyph: '!', tag: 'Cut-off' },
  Dispatch: { color: 'var(--blue)', tint: 'var(--blue-t)', glyph: '⇄', tag: 'Dispatch' },
  Retain: { color: 'var(--teal)', tint: 'var(--teal-t)', glyph: '↺', tag: 'Retain' },
  RTO: { color: 'var(--orange)', tint: 'var(--orange-t)', glyph: '↩', tag: 'RTO' },
  Shelf: { color: 'var(--violet)', tint: 'var(--violet-t)', glyph: '▤', tag: 'Shelf' },
  Ops: { color: 'var(--brand)', tint: 'var(--brand-tint)', glyph: '●', tag: 'Ops' },
};

export const NOTIFICATIONS = [
  { id: 'n12', time: '13:42', kind: 'Alert', text: 'Cut-off in 33 min: 2 re-sold units still to hand over for the 14:30 shuttle VH-DS-12 → Delhi South LMSC.', link: '/dispatch', unread: true },
  { id: 'n11', time: '13:18', kind: 'Retain', text: 'New order ORD-88262 (Saket, 8 km) matched to retained serum VL7731371-0129 on R-4-11. Send by 14:15.', link: '/sku/MS-BT-30915', unread: true },
  { id: 'n10', time: '13:10', kind: 'Dispatch', text: 'VH-DS-09 reached Delhi South LMSC. Kurta VL7731350-0118 sorted to LMDC-DL-14 Dwarka for ORD-88231.', link: '/sku/MS-KR-20431', unread: true },
  { id: 'n9', time: '13:05', kind: 'Dispatch', text: 'Bedsheet VL7731366-0054 picked from R-4-07 and scanned at dock D-2 for VH-DS-12.', link: '/dispatch' },
  { id: 'n8', time: '12:48', kind: 'RTO', text: '240 of 388 RTO units loaded for the 18:00 line-haul to the Delhi RTO hub.', link: '/rto?filter=RTO' },
  { id: 'n7', time: '12:41', kind: 'Retain', text: 'New order ORD-88247 (Faridabad NIT, 20 km) matched to retained bedsheet VL7731366-0054.', link: '/sku/MS-BD-11872' },
  { id: 'n6', time: '12:30', kind: 'Dispatch', text: 'Shuttle VH-DS-09 left for Delhi South LMSC with 38 re-sold units.', link: '/dispatch' },
  { id: 'n5', time: '12:08', kind: 'Dispatch', text: 'Kurta VL7731350-0118 loaded on VH-DS-09 for ORD-88231 (Dwarka, 25 km).', link: '/dispatch' },
  { id: 'n4', time: '11:30', kind: 'Shelf', text: '111 units reached the 21-day hold limit and moved to the seller return bay.', link: '/shelf' },
  { id: 'n3', time: '10:52', kind: 'Retain', text: 'New order ORD-88231 (Dwarka, 25 km) matched to retained kurta VL7731350-0118 on R-4-03.', link: '/sku/MS-KR-20431' },
  { id: 'n2', time: '10:05', kind: 'Shelf', text: 'Hold shelf R-4 is 85% full (2,540 of 3,000 slots). Alert level is 90%.', link: '/shelf' },
  { id: 'n1', time: '08:05', kind: 'Ops', text: 'All 62 riders checked in · 4,620 parcels out for delivery.', link: '/' },
];
