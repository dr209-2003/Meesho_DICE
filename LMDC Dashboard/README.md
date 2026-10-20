# LMDC Dashboard

**Live application:** [valmo-save-lmdc.vercel.app/rto](https://valmo-save-lmdc.vercel.app/rto)

This directory contains the source code of the LMDC Dashboard, the hub operations prototype of Valmo-SAVE, developed by Team 52 Saints, IIT Kharagpur, for Meesho DICE Challenge 3.0. A video walkthrough is available in the parent directory as [Valmo-SAVE Prototype Walkthrough.mp4](../Valmo-SAVE%20Prototype%20Walkthrough.mp4).

## About the Application

The LMDC Dashboard is the working screen for the operations team at a Valmo last-mile delivery centre (LMDC). When a delivery fails and the parcel is marked as a final RTO, the Valmo-SAVE model decides whether the parcel should be retained at the hub for resale to a nearby customer or returned to the seller. The dashboard presents these decisions, explains the reasoning behind each one, and supports the daily tasks that follow: managing the hold shelf, dispatching resold units and listing retained units on Meesho Quick.

The demonstration is set at hub LMDC-DL-07, Okhla, New Delhi, using simulated data for Sunday, 4 October 2026 at 13:45 IST. On that day, 602 deliveries failed; the model recommends retaining 214 units and returning 388, with approximately 103 resales expected.

## Pages

| Page | Route | Description |
|---|---|---|
| Overview | `/` | A summary of the shift: parcels received, delivered and failed, a 14-day trend, failure reasons, delivery zones, shelf capacity, tasks and notifications |
| RTO and Retain | `/rto` | The policy rules, the day's figures, and a Retain, Cap Full or RTO decision for each product, with the hold window, probability of resale, stock cap and saving per unit. Decisions can be filtered, searched and exported to CSV. |
| SKU Detail | `/sku/:id` | Full detail for one product: probability of resale by day against the break-even line, location of nearby buyers, units held at the hub, and a control to test a shorter holding period |
| LMSC Dispatch | `/dispatch` | Resold units moving through picking, loading and dispatch to the last-mile sort centre (LMSC), with shuttle departure and cut-off times |
| Hold Shelf | `/shelf` | Shelf capacity, the age of each unit on hold, and units approaching the 21-day limit |
| Meesho Quick | `/quick-ops` | Retain a unit, complete a three-point quality check to list it on Meesho Quick, and pack and dispatch the resulting customer orders |
| Tasks and Notifications | `/tasks`, `/notifications` | The shift task list and the activity feed |

Actions taken on one page are reflected across the others, including tasks, notifications and counters. The Reset demo button in the footer restores the starting state.

## Decision Rules

| Rule | Value |
|---|---|
| Resale radius | Within 70 km of the hub |
| Maximum holding period | 21 days, and always within Meesho's 45-day lost-shipment rule |
| Cost of returning a parcel | ₹170 (₹50 forward delivery already incurred and ₹120 reverse delivery) |
| Cost of holding a parcel | ₹25 plus ₹0.33 per day |
| Condition for holding | The expected cost of holding is lower than ₹170 |
| Stock cap | The n-th unit of a product is held only if the probability of n nearby orders still justifies the cost |

The model is implemented in `src/lib/engine.js`. For each product, it calculates the probability of a sale within 70 km by each day using a negative binomial distribution, `P(sold by day t) = 1 − (1 + λt / k)^(−k)`, and the expected cost of holding for up to T days, `E[C](T) = ₹50 + ₹25 + ₹0.33 × expected days held + ₹120 × (1 − P(sold by day T))`. A parcel is held if the lowest expected cost over any holding period of up to 21 days is below ₹170.

## Directory Structure

```text
LMDC Dashboard/
├── api/
│   └── state.js                  Serverless function for the shared store used by the Meesho Quick page
├── public/
│   ├── favicon.svg               Application icon
│   └── _redirects                Routing rule for static hosting
├── scripts/
│   └── serve.mjs                 Local server for testing the production build with the API
├── src/
│   ├── main.jsx                  Application entry point and route definitions
│   ├── lib/
│   │   ├── engine.js             Valmo-SAVE hold or return decision model
│   │   ├── units.js              Units at the hub, nearby buyers and unit journeys for each product
│   │   └── format.js             Formatting, simulated clock and CSV export
│   ├── data/
│   │   ├── ops.js                Hub details and daily operating figures
│   │   ├── skus.js               The ten products shown in the demonstration
│   │   ├── dispatch.js           Shuttle schedule and units being dispatched
│   │   └── feed.js               Tasks and notifications
│   ├── state/
│   │   └── AppState.jsx          Shared state across pages and notifications
│   ├── components/
│   │   ├── layout/Layout.jsx     Header, navigation and footer
│   │   ├── charts/               Operational and product-level charts
│   │   ├── panels/               Product table and decision panel, dispatch, tasks and notifications
│   │   └── ui/                   Shared interface components and icons
│   ├── pages/
│   │   ├── Overview.jsx          Overview page
│   │   ├── RtoRetain.jsx         RTO and Retain page
│   │   ├── SkuDetail.jsx         SKU Detail page
│   │   ├── Dispatch.jsx          LMSC Dispatch page
│   │   ├── Shelf.jsx             Hold Shelf page
│   │   ├── QuickOps.jsx          Meesho Quick operations page
│   │   ├── Simple.jsx            Tasks and Notifications pages
│   │   └── NotFound.jsx          Page not found
│   ├── shared/
│   │   ├── catalog.js            Products, delivery areas and policy limits for Meesho Quick
│   │   ├── ops.js                Inventory, reservation and order rules
│   │   └── SharedStore.jsx       Data access layer with local storage fallback
│   ├── quick/                    An early version of the customer application (see note below)
│   └── styles/
│       └── global.css            Design tokens and layout styles
├── .env.example                  Template for the optional data store credentials
├── index.html                    HTML entry page
├── package.json                  Project dependencies and scripts
├── vercel.json                   Deployment routing configuration
└── vite.config.js                Build configuration
```

The `src/quick` folder contains an early version of the customer application, served at `/quick`. The final customer application is maintained separately in the [Meesho Quick App](../Meesho%20Quick%20App) directory.

## Data

The dashboard uses simulated data for a single hub and ten products. Its state is saved in the browser, so changes persist after a page refresh until the demonstration is reset. The Meesho Quick page can optionally use a shared data store: when an Upstash Redis database is connected to the Vercel project, which sets the environment variables `KV_REST_API_URL` and `KV_REST_API_TOKEN` as described in `.env.example`, inventory and orders are stored centrally through `api/state.js`. Without it, the page runs in a clearly labelled demonstration mode that stores data in the browser. The credentials are used only on the server and are never sent to the browser.

## Running Locally

The application is built with React 18 and Vite, and requires Node.js 18 or later.

```bash
cd "LMDC Dashboard"
npm install
npm run dev
```

Open http://localhost:5173/rto in a browser. To test the production build together with the shared data store, run:

```bash
npm run build
MEESHO_QUICK_MEMORY_STORE=1 node scripts/serve.mjs
```

and open http://localhost:4173.

## Deployment

Import the repository into Vercel, set the Root Directory to `LMDC Dashboard`, and retain the default Vite settings. No environment variables are required.

## Notes

This is a prototype. All figures are simulated for a single hub on a single day, and charts are drawn directly in SVG without external charting libraries.

---

Team 52 Saints: Priyanshu Raj, Bhawesh Kukreja and Dhruv Anil Rai, IIT Kharagpur. Submitted for Meesho DICE Challenge 3.0. See the [main README](../README.md) for the full project.
