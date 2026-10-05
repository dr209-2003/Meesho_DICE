// Top-10 SKUs by failed units today. λ = orders/day within 70 km (calibrated), k = NB shape.
// zones: [name, km, share of buyers, bearing° from the hub (0 = east, 90 = south)]

const sellers = {
  ananya: { name: 'Ananya Prints & Textiles', id: 'SL-48213', city: 'Sanganer, Jaipur 302029', rating: 4.2, since: 2021, rtoRate: 0.178, lane: 'Delhi → Jaipur · ₹120 · ~2 d' },
  panipat: { name: 'Shree Ram Home Furnishing', id: 'SL-31877', city: 'Panipat, Haryana 132103', rating: 4.3, since: 2020, rtoRate: 0.142, lane: 'Delhi → Panipat · ₹95 · ~1 d' },
  glow: { name: 'GlowLeaf Naturals', id: 'SL-55320', city: 'Andheri E, Mumbai 400069', rating: 4.0, since: 2022, rtoRate: 0.161, lane: 'Delhi → Mumbai · ₹140 · ~3 d' },
  tiny: { name: 'TinyTrend Kids', id: 'SL-20974', city: 'Tiruppur, Tamil Nadu 641604', rating: 4.1, since: 2021, rtoRate: 0.153, lane: 'Delhi → Tiruppur · ₹150 · ~4 d' },
  tick: { name: 'TickTock Accessories', id: 'SL-61205', city: 'Karol Bagh, Delhi 110005', rating: 3.9, since: 2023, rtoRate: 0.204, lane: 'Delhi → Delhi · ₹60 · same day' },
  clay: { name: 'Khurja Clay Works', id: 'SL-44718', city: 'Khurja, UP 203131', rating: 4.4, since: 2019, rtoRate: 0.118, lane: 'Delhi → Khurja · ₹90 · ~1 d' },
  click: { name: 'ClickPro Electronics', id: 'SL-70033', city: 'Lamington Rd, Mumbai 400007', rating: 4.0, since: 2022, rtoRate: 0.137, lane: 'Delhi → Mumbai · ₹140 · ~3 d' },
  steel: { name: 'Jagdamba Steel Udyog', id: 'SL-38051', city: 'Jagadhri, Haryana 135003', rating: 4.1, since: 2020, rtoRate: 0.109, lane: 'Delhi → Jagadhri · ₹110 · ~2 d' },
  wood: { name: 'Saharanpur Woodcraft', id: 'SL-27486', city: 'Saharanpur, UP 247001', rating: 4.2, since: 2021, rtoRate: 0.126, lane: 'Delhi → Saharanpur · ₹100 · ~2 d' },
  case: { name: 'CaseKart', id: 'SL-80412', city: 'Gaffar Market, Delhi 110005', rating: 3.8, since: 2023, rtoRate: 0.231, lane: 'Delhi → Delhi · ₹60 · same day' },
};

export const SKUS = [
  {
    id: 'MS-KR-20431', ini: 'KU', color: '#E8396B', name: 'Rayon A-line kurta · navy, M', title: 'Women’s rayon A-line kurta with gold print',
    cat: 'Women ethnic', sub: 'Kurtas', failed: 18, shelf: 5, lambda: 0.55, k: 0.9,
    price: 449, mrp: 999, rating: 4.1, ratings: 2340, catalog: '7731905', hsn: '6204', weight: '280 g', pack: '30 × 25 × 3 cm', fabric: 'Rayon, printed',
    attrs: ['Size M', 'Navy', 'COD eligible'], seller: sellers.ananya, rack: 'R-4-03',
    zones: [['Lajpat Nagar', 4, 0.24, 250], ['Noida Sec 18', 10, 0.19, 15], ['Dwarka', 25, 0.14, 190], ['Gurugram Sec 14', 28, 0.11, 140], ['Ghaziabad', 22, 0.09, 320], ['Faridabad NIT', 20, 0.08, 95]],
    history: { retained: 32, resold: 15, capped: 1, avgDays: 2.4 },
  },
  {
    id: 'MS-BD-11872', ini: 'BS', color: '#3D6CE0', name: 'Cotton double bedsheet + 2 covers', title: 'Cotton double bedsheet with 2 pillow covers',
    cat: 'Home', sub: 'Bedsheets', failed: 14, shelf: 4, lambda: 0.40, k: 0.8,
    price: 399, mrp: 1199, rating: 4.2, ratings: 5120, catalog: '6620418', hsn: '6302', weight: '820 g', pack: '35 × 28 × 6 cm', fabric: '100% cotton',
    attrs: ['Double', 'Floral blue', 'COD eligible'], seller: sellers.panipat, rack: 'R-4-07',
    zones: [['Kalkaji', 3, 0.22, 200], ['Faridabad NIT', 20, 0.18, 95], ['Mayur Vihar', 9, 0.16, 330], ['Ghaziabad', 22, 0.12, 320]],
    history: { retained: 24, resold: 11, capped: 1, avgDays: 3.1 },
  },
  {
    id: 'MS-BT-30915', ini: 'SE', color: '#7B3FE4', name: 'Vitamin C face serum 30 ml', title: 'Vitamin C face serum with hyaluronic acid · 30 ml',
    cat: 'Beauty', sub: 'Skin care', failed: 11, shelf: 3, lambda: 0.30, k: 0.6,
    price: 249, mrp: 599, rating: 4.0, ratings: 3890, catalog: '8812044', hsn: '3304', weight: '90 g', pack: '12 × 5 × 5 cm', fabric: '—',
    attrs: ['30 ml', 'All skin types', 'COD eligible'], seller: sellers.glow, rack: 'R-4-11',
    zones: [['Saket', 8, 0.25, 230], ['Noida Sec 62', 15, 0.2, 10], ['Rohini', 30, 0.13, 290], ['Gurugram DLF', 26, 0.12, 150]],
    history: { retained: 17, resold: 8, capped: 1, avgDays: 4.6 },
  },
  {
    id: 'MS-KD-07718', ini: 'KT', color: '#F5A623', name: 'Kids’ printed tees · pack of 3', title: 'Kids’ cotton printed T-shirts · pack of 3',
    cat: 'Kidswear', sub: 'T-shirts', failed: 10, shelf: 2, lambda: 0.28, k: 0.9,
    price: 329, mrp: 799, rating: 4.1, ratings: 1870, catalog: '5590132', hsn: '6109', weight: '310 g', pack: '28 × 22 × 4 cm', fabric: 'Cotton',
    attrs: ['Age 4–5 y', 'Multicolour', 'COD eligible'], seller: sellers.tiny, rack: 'R-4-14',
    zones: [['Sangam Vihar', 7, 0.23, 200], ['Badarpur', 6, 0.2, 110], ['Faridabad Sec 21', 18, 0.17, 100], ['Noida Sec 49', 13, 0.12, 20]],
    history: { retained: 16, resold: 8, capped: 0, avgDays: 4.0 },
  },
  {
    id: 'MS-AC-55120', ini: 'WA', color: '#0E9F8E', name: 'Men’s analog watch · black dial', title: 'Men’s analog wrist watch with black dial',
    cat: 'Accessories', sub: 'Watches', failed: 9, shelf: 2, lambda: 0.20, k: 0.7,
    price: 299, mrp: 1499, rating: 3.9, ratings: 6210, catalog: '4471809', hsn: '9102', weight: '140 g', pack: '12 × 10 × 8 cm', fabric: '—',
    attrs: ['Black dial', 'Leather strap', 'COD eligible'], seller: sellers.tick, rack: 'R-4-18',
    zones: [['Laxmi Nagar', 12, 0.21, 330], ['Janakpuri', 22, 0.18, 250], ['Indirapuram', 16, 0.16, 345], ['Gurugram Sec 56', 27, 0.11, 150]],
    history: { retained: 12, resold: 6, capped: 1, avgDays: 5.2 },
  },
  {
    id: 'MS-HG-40266', ini: 'PL', color: '#038D63', name: 'Ceramic planters · set of 3', title: 'Ceramic table-top planters · set of 3',
    cat: 'Home & garden', sub: 'Planters', failed: 8, shelf: 1, lambda: 0.15, k: 0.8,
    price: 379, mrp: 899, rating: 4.3, ratings: 980, catalog: '3304561', hsn: '6913', weight: '1.1 kg', pack: '26 × 26 × 14 cm', fabric: '—',
    attrs: ['Set of 3', 'White matte', 'Fragile'], seller: sellers.clay, rack: 'R-4-21',
    zones: [['Greater Kailash', 4, 0.21, 230], ['Gurugram Sec 49', 26, 0.19, 160], ['Noida Sec 128', 17, 0.15, 60], ['Vasant Kunj', 13, 0.11, 220]],
    history: { retained: 9, resold: 4, capped: 1, avgDays: 7.5 },
  },
  {
    id: 'MS-EL-62004', ini: 'MO', color: '#2BA6DE', name: 'Wireless mouse · 2.4 GHz', title: 'Wireless optical mouse · 2.4 GHz',
    cat: 'Electronics acc.', sub: 'Mouse', failed: 7, shelf: 1, lambda: 0.12, k: 0.6,
    price: 219, mrp: 699, rating: 4.0, ratings: 4410, catalog: '9905217', hsn: '8471', weight: '110 g', pack: '15 × 10 × 5 cm', fabric: '—',
    attrs: ['2.4 GHz', 'Black', 'COD eligible'], seller: sellers.click, rack: 'R-4-24',
    zones: [['Nehru Place', 2, 0.26, 260], ['Noida Sec 63', 15, 0.17, 15], ['Cyber City', 27, 0.14, 160], ['Pitampura', 28, 0.1, 300]],
    history: { retained: 7, resold: 3, capped: 1, avgDays: 9.0 },
  },
  {
    id: 'MS-KT-18450', ini: 'KR', color: '#8B8BA3', name: 'Steel kitchen rack · 3-tier', title: 'Stainless steel kitchen rack · 3-tier',
    cat: 'Kitchen', sub: 'Storage', failed: 6, shelf: 0, lambda: 0.05, k: 0.6,
    price: 549, mrp: 1299, rating: 4.1, ratings: 760, catalog: '2208134', hsn: '7323', weight: '2.4 kg', pack: '45 × 30 × 10 cm', fabric: '—',
    attrs: ['3-tier', 'Stainless steel', 'Bulky'], seller: sellers.steel, rack: 'R-4-26',
    zones: [['Faridabad Old', 22, 0.21, 100], ['Ghaziabad Raj Nagar', 24, 0.17, 320], ['Okhla', 1, 0.14, 0], ['Sonipat', 50, 0.09, 290]],
    history: { retained: 3, resold: 1, capped: 1, avgDays: 12.0 },
  },
  {
    id: 'MS-DC-09333', ini: 'WC', color: '#B5541F', name: 'Wooden wall clock · 12 in', title: 'Handcrafted wooden wall clock · 12 inch',
    cat: 'Decor', sub: 'Clocks', failed: 5, shelf: 1, lambda: 0.03, k: 0.5,
    price: 499, mrp: 1199, rating: 4.2, ratings: 540, catalog: '1170625', hsn: '9105', weight: '900 g', pack: '34 × 34 × 6 cm', fabric: '—',
    attrs: ['12 inch', 'Walnut finish', 'Fragile'], seller: sellers.wood, rack: 'R-4-29',
    zones: [['Meerut', 68, 0.2, 330], ['Greater Noida', 30, 0.17, 60], ['Malviya Nagar', 7, 0.12, 230], ['Palwal', 52, 0.09, 100]],
    history: { retained: 2, resold: 1, capped: 0, avgDays: 14.0 },
  },
  {
    id: 'MS-MB-71209', ini: 'PC', color: '#E86C2C', name: 'Phone back cover · model-specific', title: 'Printed phone back cover · model-specific',
    cat: 'Mobile acc.', sub: 'Covers', failed: 6, shelf: 0, lambda: 0.012, k: 0.4,
    price: 149, mrp: 499, rating: 3.8, ratings: 2210, catalog: '6603318', hsn: '3926', weight: '60 g', pack: '18 × 10 × 2 cm', fabric: '—',
    attrs: ['One model only', 'Printed', 'COD eligible'], seller: sellers.case, rack: '—',
    zones: [['Gurugram Sec 29', 26, 0.22, 160], ['Noida Sec 76', 19, 0.13, 30], ['Sonipat', 50, 0.1, 290], ['Palwal', 52, 0.08, 100]],
    history: { retained: 0, resold: 0, capped: 0, avgDays: 0 },
  },
];

export const skuById = (id) => SKUS.find((s) => s.id === id);
