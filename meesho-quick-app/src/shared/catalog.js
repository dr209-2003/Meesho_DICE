// Meesho Quick catalogue. Products and photos come from the Meesho Quick screens in our deck.
// Engine fields (lambda = orders/day within 70 km, k = burstiness, failed = failed units today, shelf = units already held)
// feed the same Valmo-SAVE hold/return engine used in the LMDC dashboard.

export const RADIUS_KM = 70;
export const HOLD_DAYS = 21;
export const QUICK_HUB = { id: 'LMDC-DL-07', name: 'Valmo LMDC, Delhi South (Okhla)' };

export const PRODUCTS = [
  {
    id: 'MQ-KUR-PINK', title: 'Women’s Cotton Kurti', short: 'Pink cotton kurti', img: '/img/kurti-pink.jpg', views: ['center 20%', 'center 45%', 'center 70%'],
    price: 499, mrp: 899, rating: 4.3, ratings: 12500, tab: 'Fashion', catId: 'women', axis: 'Size', options: ['S', 'M', 'L', 'XL'],
    seller: 'Ananya Prints & Textiles', sellerCity: 'Jaipur', about: ['100% cotton, block-print pattern', 'Straight fit, calf length', 'Round neck with keyhole buttons', 'Machine wash cold'],
    lambda: 0.55, k: 0.9, failed: 18, shelf: 5,
  },
  {
    id: 'MQ-SNK-PINK', title: 'Casual Sneakers', short: 'Casual sneakers', img: '/img/sneakers.jpg', views: ['center', 'left center', 'right center'],
    price: 699, mrp: 1299, rating: 4.2, ratings: 8100, tab: 'Fashion', catId: 'women', axis: 'Size', options: ['UK 5', 'UK 6', 'UK 7', 'UK 8'],
    seller: 'StepUp Footwear', sellerCity: 'Agra', about: ['Lightweight lace-up sneakers', 'Cushioned insole', 'Anti-skid rubber sole', 'Wipe clean'],
    lambda: 0.45, k: 0.8, failed: 12, shelf: 3,
  },
  {
    id: 'MQ-KUR-GRN', title: 'Printed Cotton Kurta', short: 'Green printed kurta', img: '/img/kurti-green.jpg', views: ['center 30%', 'center', 'center 80%'],
    price: 549, mrp: 999, rating: 4.1, ratings: 5300, tab: 'Fashion', catId: 'women', axis: 'Size', options: ['S', 'M', 'L', 'XL'],
    seller: 'Ananya Prints & Textiles', sellerCity: 'Jaipur', about: ['Soft cotton with ethnic print', 'Three-quarter sleeves', 'Straight cut', 'Machine wash cold'],
    lambda: 0.35, k: 0.8, failed: 9, shelf: 3,
  },
  {
    id: 'MQ-COOK-2', title: 'Non-stick Cookware Set (2 pots)', short: 'Cookware set', img: '/img/cookware.jpg', views: ['center', 'left center', 'right center'],
    price: 799, mrp: 1499, rating: 4.4, ratings: 3200, tab: 'Home', catId: 'home', axis: 'Pack', options: ['Set of 2'],
    seller: 'Khurja Kitchen Craft', sellerCity: 'Khurja', about: ['Non-stick coated aluminium', 'Glass lids with steam vent', 'Gas and induction compatible', '2.5 L and 3.5 L'],
    lambda: 0.25, k: 0.7, failed: 6, shelf: 2,
  },
  {
    id: 'MQ-POLO-GRN', title: 'Men’s Polo Neck Full Sleeve T-shirt', short: 'Men’s polo T-shirt', img: '/img/polo.jpg', views: ['center', 'center 30%', 'center 75%'],
    price: 345, mrp: 699, rating: 3.9, ratings: 530, tab: 'Fashion', catId: 'men', axis: 'Size', options: ['M', 'L', 'XL'],
    seller: 'TrendKart Menswear', sellerCity: 'Tiruppur', about: ['Cotton-blend fleece', 'Polo collar, full sleeves', 'Varsity print', 'Machine wash'],
    lambda: 0.3, k: 0.9, failed: 7, shelf: 3,
  },
].map((p) => ({ ...p, off: Math.round((1 - p.price / p.mrp) * 100), name: p.title }));

export const productById = (id) => PRODUCTS.find((p) => p.id === id);
export const SKUS = PRODUCTS; // engine input (id, lambda, k, failed, shelf)

export const CATEGORIES = [
  { id: 'all', name: 'All', icon: '/img/cat-all.jpg' },
  { id: 'women', name: 'Women', icon: '/img/cat-women.jpg' },
  { id: 'men', name: 'Men', icon: '/img/cat-men.jpg' },
  { id: 'home', name: 'Home', icon: '/img/cat-home.jpg' },
  { id: 'beauty', name: 'Beauty', icon: '/img/cat-beauty.jpg' },
  { id: 'electronics', name: 'Electronics', icon: '/img/cat-electronics.jpg' },
];
export const TABS = ['All', 'Fashion', 'Home', 'Beauty', 'Electronics'];

// Delivery locations. km = straight-line distance from the Delhi South LMDC.
export const AREAS = [
  { id: 'cp', name: 'Connaught Place', city: 'Delhi', pin: '110001', km: 12 },
  { id: 'okhla', name: 'Okhla Phase 2', city: 'Delhi', pin: '110020', km: 1 },
  { id: 'saket', name: 'Saket', city: 'Delhi', pin: '110017', km: 8 },
  { id: 'noida18', name: 'Noida Sector 18', city: 'Noida', pin: '201301', km: 10 },
  { id: 'gurugram', name: 'Gurgaon Sector 22', city: 'Gurgaon', pin: '122015', km: 14 },
  { id: 'dwarka', name: 'Dwarka Sector 10', city: 'Delhi', pin: '110075', km: 25 },
  { id: 'faridabad', name: 'Faridabad NIT', city: 'Faridabad', pin: '121001', km: 20 },
  { id: 'meerut', name: 'Meerut', city: 'Meerut', pin: '250001', km: 69 },
  { id: 'jaipur', name: 'Jaipur', city: 'Jaipur', pin: '302001', km: 240 },
];
export const areaById = (id) => AREAS.find((a) => a.id === id);
export const inQuickZone = (area) => !!area && area.km <= RADIUS_KM;
