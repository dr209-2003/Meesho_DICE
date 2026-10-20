# Meesho Quick · Valmo-SAVE customer app

Team 52 Saints · IIT Kharagpur · Meesho DICE Challenge 3.0

A clickable, mobile-first shopping app (designed at 390 px). It sells products that **could not be delivered, were held at a nearby Valmo hub under Valmo-SAVE, and passed a quality check**, delivered in 1–2 days at the same price. The screens follow the Meesho Quick mock-ups in our deck.

## Screens

| Route | Screen |
|---|---|
| `/` | Home: meesho header, search, wishlist, cart, Meesho Quick banner, categories, trust strip, Deals for You, Available near you |
| `/quick` | Meesho Quick store: deliver-to pincode, Available Today / 1–2 Days / Prepaid Only / Local Stock, tabs, sort, live stock, "Just sold out near you" |
| `/p/:id` | Product: gallery with share, "Available near you · Get it in 1–2 days", rating, price, "Pay Online for Faster Delivery", size and quantity, Add to Cart / Buy Now (Prepaid) |
| `/cart`, `/checkout` | Quantity edits, sold-out warnings, demo address form, cash on delivery or a clearly **simulated** online payment |
| `/order/:id`, `/orders` | Confirmation, tracking (placed → packed → out for delivery → delivered), cancel, order history |
| `/categories`, `/category/:id`, `/search`, `/account` | Browse, search (also by product ID), wishlist, delivery location |
| `/hub` | Valmo hub view for the LMDC team: retain a failed delivery (engine-checked), 3-point QC, then pack and dispatch orders |

The flow works end to end: a unit retained and checked in `/hub` appears in `/quick`; ordering it reserves that exact unit (it can never be sold twice); the hub sees the order and its status updates show on the customer's tracking page.

## Data: two honest modes

- **Demo mode (default, no setup):** stock and orders are saved in the browser. The app says so in a yellow strip. The hub view in another tab of the same browser stays in sync.
- **Live shared mode (optional):** connect a free Upstash Redis database in Vercel (it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`). Then `/api/state` shares stock and orders across every phone and laptop, and orders use an atomic compare-and-set so the last unit can't be sold twice. Secrets stay on the server.

## Run locally

```bash
npm install
npm run dev                                         # demo mode, http://localhost:5173
npm run build && MEESHO_QUICK_MEMORY_STORE=1 npm run serve   # with the shared API, http://localhost:4173
```

Product photos in `public/img` are taken from our own deck mock-ups. Payments, delivery dates and tracking updates are simulated for the demo.
