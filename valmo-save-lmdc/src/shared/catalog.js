// Customer-facing catalogue for Meesho Quick. Built on the same SKUs the LMDC dashboard decides on,
// so a unit retained in the dashboard is the exact product a customer sees in the app.
import { SKUS } from '../data/skus.js';
import { HUB } from '../data/ops.js';

export const RADIUS_KM = 70;
export const HOLD_DAYS = 21;
export const QUICK_HUB = { id: HUB.id, name: HUB.name };

// variant axis, options, and the art colour for each option
const EXTRA = {
  'MS-KR-20431': { art: 'kurta', axis: 'Size', options: ['S', 'M', 'L', 'XL'], tone: { S: '#25306b', M: '#25306b', L: '#25306b', XL: '#25306b' },
    about: ['Rayon fabric with gold foil print', 'A-line, calf length, 3/4 sleeves', 'Round neck with keyhole', 'Hand wash cold'] },
  'MS-BD-11872': { art: 'bedsheet', axis: 'Colour', options: ['Floral blue', 'Floral pink'], tone: { 'Floral blue': '#3d6ce0', 'Floral pink': '#e8396b' },
    about: ['100% cotton, 144 TC', 'Double bed: 90 × 100 in', '2 pillow covers: 17 × 27 in', 'Machine wash'] },
  'MS-BT-30915': { art: 'serum', axis: 'Pack', options: ['30 ml'], tone: { '30 ml': '#f5a623' },
    about: ['Vitamin C + hyaluronic acid', 'For all skin types', 'Dropper bottle, 30 ml', 'Sealed pack, 24 months shelf life'] },
  'MS-KD-07718': { art: 'tees', axis: 'Age', options: ['2–3 y', '4–5 y', '6–7 y'], tone: { '2–3 y': '#f5a623', '4–5 y': '#f5a623', '6–7 y': '#f5a623' },
    about: ['Pack of 3 printed T-shirts', 'Soft combed cotton', 'Regular fit, round neck', 'Machine wash'] },
  'MS-AC-55120': { art: 'watch', axis: 'Dial', options: ['Black dial', 'Blue dial'], tone: { 'Black dial': '#22222e', 'Blue dial': '#25306b' },
    about: ['Quartz analog movement', 'Faux-leather strap', '40 mm stainless case', '6-month seller warranty'] },
  'MS-HG-40266': { art: 'planters', axis: 'Finish', options: ['White matte', 'Terracotta'], tone: { 'White matte': '#f1efe9', Terracotta: '#c8693c' },
    about: ['Set of 3 ceramic pots', 'Heights 8, 10, 12 cm', 'Drainage hole with plug', 'Plants not included'] },
  'MS-EL-62004': { art: 'mouse', axis: 'Colour', options: ['Black', 'Grey'], tone: { Black: '#2a2a35', Grey: '#9a9aae' },
    about: ['2.4 GHz nano receiver', '1600 DPI optical sensor', 'Works up to 10 m', '1 AA battery included'] },
  'MS-KT-18450': { art: 'rack', axis: 'Size', options: ['3-tier'], tone: { '3-tier': '#a3a3b8' },
    about: ['Rust-proof stainless steel', '3 tiers, 45 × 30 × 75 cm', 'Holds up to 15 kg', 'Easy assembly'] },
  'MS-DC-09333': { art: 'clock', axis: 'Finish', options: ['Walnut'], tone: { Walnut: '#7a4a24' },
    about: ['Handcrafted sheesham wood', '12 inch dial, silent sweep', 'Ready to hang', '1 AA battery'] },
  'MS-MB-71209': { art: 'cover', axis: 'Phone', options: ['Redmi Note 12', 'Galaxy A14', 'iPhone 13'], tone: { 'Redmi Note 12': '#e86c2c', 'Galaxy A14': '#e86c2c', 'iPhone 13': '#e86c2c' },
    about: ['Matte printed hard case', 'Raised camera lip', 'Fits one model only', 'Wipe clean'] },
};

export const CATEGORIES = [
  { id: 'women', name: 'Women ethnic', tint: '#fde6ee', skus: ['MS-KR-20431'] },
  { id: 'home', name: 'Home', tint: '#e7eefc', skus: ['MS-BD-11872', 'MS-HG-40266', 'MS-DC-09333'] },
  { id: 'beauty', name: 'Beauty', tint: '#fef3dc', skus: ['MS-BT-30915'] },
  { id: 'kids', name: 'Kids', tint: '#fff1d6', skus: ['MS-KD-07718'] },
  { id: 'accessories', name: 'Accessories', tint: '#ddf4f0', skus: ['MS-AC-55120'] },
  { id: 'electronics', name: 'Electronics', tint: '#e1f3fb', skus: ['MS-EL-62004', 'MS-MB-71209'] },
  { id: 'kitchen', name: 'Kitchen', tint: '#efeff5', skus: ['MS-KT-18450'] },
];

export const PRODUCTS = SKUS.map((s) => {
  const x = EXTRA[s.id];
  const cat = CATEGORIES.find((c) => c.skus.includes(s.id));
  return {
    id: s.id, title: s.title, short: s.name.split(' · ')[0], price: s.price, mrp: s.mrp,
    off: Math.round((1 - s.price / s.mrp) * 100), rating: s.rating, ratings: s.ratings,
    seller: s.seller.name, sellerCity: s.seller.city, catId: cat.id, catName: cat.name, sub: s.sub,
    art: x.art, axis: x.axis, options: x.options, tone: x.tone, about: x.about, weight: s.weight,
  };
});

export const productById = (id) => PRODUCTS.find((p) => p.id === id);

// Delivery locations for the demo. km = straight-line distance from the Okhla LMDC.
export const AREAS = [
  { id: 'okhla', name: 'Okhla Phase 2', city: 'New Delhi', pin: '110020', km: 1 },
  { id: 'lajpat', name: 'Lajpat Nagar', city: 'New Delhi', pin: '110024', km: 4 },
  { id: 'saket', name: 'Saket', city: 'New Delhi', pin: '110017', km: 8 },
  { id: 'noida18', name: 'Noida Sector 18', city: 'Noida', pin: '201301', km: 10 },
  { id: 'faridabad', name: 'Faridabad NIT', city: 'Faridabad', pin: '121001', km: 20 },
  { id: 'ghaziabad', name: 'Ghaziabad', city: 'Ghaziabad', pin: '201001', km: 22 },
  { id: 'dwarka', name: 'Dwarka Sector 10', city: 'New Delhi', pin: '110075', km: 25 },
  { id: 'gurugram', name: 'Gurugram Sector 14', city: 'Gurugram', pin: '122001', km: 28 },
  { id: 'meerut', name: 'Meerut', city: 'Meerut', pin: '250001', km: 68 },
  { id: 'agra', name: 'Agra', city: 'Agra', pin: '282001', km: 185 },
  { id: 'jaipur', name: 'Jaipur', city: 'Jaipur', pin: '302001', km: 240 },
];
export const areaById = (id) => AREAS.find((a) => a.id === id);
export const inQuickZone = (area) => !!area && area.km <= RADIUS_KM;
