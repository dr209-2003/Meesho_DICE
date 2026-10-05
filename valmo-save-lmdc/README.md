# Valmo-SAVE · LMDC Dashboard

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
  pages/                   Overview, RtoRetain, SkuDetail, Dispatch, Shelf, Tasks/Notifications, NotFound
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
