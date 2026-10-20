# Valmo-SAVE · LMDC Dashboard + Meesho Quick

A responsive React web app for the Valmo-SAVE prototype by Team 52 Saints (IIT Kharagpur, Meesho DICE Challenge 3.0). A failed delivery can be **held at the last-mile hub and resold to a new buyer within 70 km** instead of always being returned to the seller (RTO).

The app uses simulated data for **Sun 04 Oct 2026, 13:45 IST** at hub LMDC-DL-07 (Okhla, New Delhi).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
```

You need Node 18 or later. The only runtime libraries are React 18 and React Router 6. Every chart is hand-built in SVG, so no chart library is needed.

## Screens and routes

| Route | Screen | What you can do |
|---|---|---|
| `/` | **Overview** | KPI cards with 14-day sparklines. Charts: parcel-flow (Sankey) chart, 14-day failure + success-rate chart, failure-reason donut, zone bars, shelf gauge, category treemap. Includes the **Tasks** and **Notifications** panels. Tick tasks done, open any notification (it takes you to the right screen), mark all read, download the day report as CSV. |
| `/rto` | **RTO & Retain** | Policy strip, KPI tiles, and a decision for every SKU from the live engine. The panel explaining a decision and the **Delhi South LMSC dispatch** panel sit beside the table. You can filter (`?filter=Retain` or `?filter=RTO`), search (`?q=`), select a row (`?sku=`), export decisions as CSV, and apply all recommendations. |
| `/sku/:skuId` | **SKU detail** (works for all 10 SKUs) | Product card, seller and buyers, decision banner, and a **max-hold-days slider** that re-runs the engine. Also: resale curve, buyer ring map, units at the hub (FIFO), the unit's journey, a "Return all to seller" button, and previous/next/switch SKU. |
| `/dispatch` | **LMSC Dispatch** | Shuttle timeline (every 2 h, cut-off 15 min before departure) and shuttle schedule. The three units retained on 02 Oct and re-ordered today move picked → loaded → sent. Each step updates the tasks and notifications. |
| `/shelf` | **Hold Shelf** | Capacity gauge, ages of units on the shelf, the units closest to the 21-day limit (with "move to RTO"), each SKU's units against its stock cap, and the capacity-check task. |
| `/tasks` | Tasks | Full task list. |
| `/notifications` | Notifications | Full feed with filters. |
| `*` | 404 page | |

Actions on one page show up on the others. For example, loading the bedsheet on the Dispatch screen updates the header badge, the Overview KPI, the task progress, the notification feed and the SKU page's unit status.

State is stored in `localStorage`, so it survives a page refresh. **Reset demo** in the footer restores the 13:45 starting state.

## Meesho Quick (customer app) and the shared store

`/quick` is a mobile-first customer app (designed at 390 px). It sells **only units that the LMDC retained under Valmo-SAVE and passed QC**, to buyers within 70 km of the hub, with 1-day delivery at the regular listing price.

| Route | Screen |
|---|---|
| `/quick` | Home: search, location selector, cart, Quick banner, categories, "Available near you", all products |
| `/quick/near-you` | Quick storefront: live nearby stock, search, filters (category, under ₹300), sort, "Just sold out near you" |
| `/quick/categories`, `/quick/category/:id`, `/quick/search` | Browse and search |
| `/quick/p/:id` | Product: 3-image gallery, variant chips (green dot = in stock nearby), quantity, delivery estimate, Add to cart, Buy now |
| `/quick/cart`, `/quick/checkout` | Quantity edits, stock warnings, demo address form, COD or **simulated** online payment (success/failure), place order |
| `/quick/order/:id`, `/quick/orders` | Confirmation, tracking timeline (placed → packed → out for delivery → delivered), cancel, order history |
| `/quick/account` | Profile, data-mode status, links |
| `/quick-ops` (dashboard) | Retain a unit (engine eligibility + stock cap) → 3-point QC → live in the app; fulfil Quick orders; hold-shelf units; activity log |

**Integration flow:** retain in `/quick-ops` → pass QC → the unit appears in `/quick/near-you` for in-zone locations → a customer orders → the exact unit is reserved atomically (no oversell) → the dashboard shows the order and updated stock → the hub marks packed/dispatched/delivered and the customer's tracking updates.

### Data modes (no fake sync)

- **Shared (live):** `api/state.js` is a Vercel serverless function backed by Upstash Redis over REST. Writes go through a compare-and-set Lua script, so concurrent orders for the last unit cannot both succeed. Every client polls every 4 s. Works across devices.
- **Local demo:** if the env vars are missing, `/api/state` returns 503 and the app switches to `localStorage` + `BroadcastChannel`. Data is shared only between tabs of the same browser, and the UI says so on every screen.

Both modes run the same rules from `src/shared/ops.js`.

### Deploy on Vercel

1. Import this folder as a Vercel project (framework preset: Vite; build `npm run build`; output `dist`).
2. In **Storage / Marketplace**, add **Upstash for Redis** and connect it to the project. This sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` (server-side only; see `.env.example`).
3. Redeploy. `/quick-ops` should show "Live shared store".

### Test locally with the API

```bash
npm run build
MEESHO_QUICK_MEMORY_STORE=1 node scripts/serve.mjs   # http://localhost:4173 with an in-memory shared store
# or with real Upstash: KV_REST_API_URL=... KV_REST_API_TOKEN=... node scripts/serve.mjs
```

`npm run dev` (Vite only) has no API, so it runs in local demo mode.

## Project structure

```
src/
  main.jsx                 routes
  state/AppState.jsx       shared state (tasks, notifications, dispatch, overrides) + toasts
  lib/engine.js            Valmo-SAVE decision engine (NB resale curve, cost, stock cap)
  lib/units.js             units at the hub, buyers and journeys per SKU
  lib/format.js            formatting, simulated clock, CSV download
  data/                    ops numbers, 10 SKUs, shuttles & featured units, tasks & notifications
  components/layout/       header with responsive nav + mobile drawer, footer
  components/ui/           Card, KPI, Tile, Pill, Ring, Sparkline, icons
  components/charts/       Sankey, combo, donut, zones, gauge, treemap, resale curve, ring map, shuttle strip
  components/panels/       Tasks, Notifications, Dispatch, SKU table / side panel
  pages/                   Overview, RtoRetain, SkuDetail, Dispatch, Shelf, QuickOps, Tasks/Notifications, NotFound
  shared/                  catalog, ops (inventory + order rules), SharedStore (API client / local fallback)
  quick/                   Meesho Quick customer app (screens, product art, styles)
api/state.js               Vercel function: shared store on Upstash Redis
scripts/serve.mjs          local server for dist + API
  styles/global.css        design tokens (Meesho magenta #9F2089 / pink #F43397) and responsive grid
```

## The decision engine (`src/lib/engine.js`)

- **Chance a held unit has resold by day t** (negative-binomial demand within 70 km): `P(t) = 1 − (1 + λt/k)^−k`
- **Expected cost of holding up to T days:** `E[C](T) = ₹50 + ₹25 + ₹0.333 · E[shelf-days] + ₹120 · (1 − P(T))`
- **Rule:** hold only if `min E[C](T) < ₹170` (the cost of RTO), with T ≤ 21 days.
- **Stock cap:** the n-th unit of a SKU is held only while the chance of n orders still beats ₹170.

## Responsive breakpoints

| Width | Layout |
|---|---|
| ≥ 1600 px | Full three-column layouts |
| ≤ 1600 px | Side panels wrap |
| ≤ 1180 px | Single column; the nav moves into a menu drawer |
| ≤ 760 px | Phone layout: 2-up KPIs, stacked cards, tables scroll sideways |

## Deploy

Deploy `dist/` to any static host. Single-page-app fallbacks are already included: `public/_redirects` for Netlify and `vercel.json` for Vercel.
