# LMDC Dashboard · Valmo-SAVE

**The daily screen for the team at a Valmo last-mile delivery centre (LMDC): which failed deliveries to hold for local resale, and which to send back.**

[![Live demo](https://img.shields.io/badge/Live%20demo-valmo--save--lmdc.vercel.app-9f2089?style=for-the-badge)](https://valmo-save-lmdc.vercel.app/rto)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?style=flat-square&logo=vercel)

> Part of [Valmo-SAVE](../README.md) by Team 52 Saints, IIT Kharagpur, for Meesho DICE Challenge 3.0.

---

## Who uses it

A shift lead at the hub (the demo is set at **LMDC-DL-07, Okhla, New Delhi**). Every failed delivery that reaches the hub gets one of two decisions from the Valmo-SAVE engine:

- **Retain**: keep it on the hold shelf and resell it to a buyer within 70 km.
- **Return to origin (RTO)**: send it back to the seller, exactly as today.

## What the hub team can do

| Screen | Route | What it does |
|---|---|---|
| **Overview** | `/` | The shift at a glance: parcels received → delivered → failed, a 14-day trend, failure reasons, delivery zones, hold-shelf gauge, tasks and notifications |
| **RTO & Retain** | `/rto` | Today's numbers (602 failed → 214 retained, 388 RTO), the policy rules, and a **Retain / Cap full / RTO decision for every product**, with the reason in plain words |
| **SKU detail** | `/sku/:id` | One product's resale chance by day, the break-even line, where nearby buyers are, and a slider to test a shorter hold |
| **LMSC dispatch** | `/dispatch` | Resold units moving to the next shuttle (pick → load → sent), with cut-off times |
| **Hold shelf** | `/shelf` | Shelf capacity, the age of every unit, and units close to the 21-day limit |
| **Meesho Quick ops** | `/quick-ops` | Retain a unit → pass a 3-point quality check → it goes live on Meesho Quick; then pack and dispatch the orders customers place |

Every action updates the other screens (tasks, notifications, counters). **Reset demo** in the footer restores the starting state.

## The rules behind every decision

| Rule | Value |
|---|---|
| Resell only within | **70 km** of the hub |
| Hold for at most | **21 days**, always inside Meesho's 45-day lost-shipment rule |
| Cost of returning now | **₹170** (₹50 forward, already spent + ₹120 reverse) |
| Cost of holding | ₹25 + ₹0.33 per day |
| Hold only if | expected cost of holding < ₹170 |
| Stock cap | the n-th unit of a product is held only if the chance of n local orders still pays |

The engine lives in [`src/lib/engine.js`](src/lib/engine.js):

```text
P(sold by day t)  = 1 − (1 + λ·t / k)^(−k)               negative-binomial demand within 70 km
E[cost](T)        = ₹50 + ₹25 + ₹0.33 · E[days held] + ₹120 · (1 − P(T))
Decision          = HOLD if min over T ≤ 21 of E[cost](T) < ₹170, otherwise RTO
```

## Run it locally

You need Node.js 18 or later.

```bash
cd "LMDC Dashboard"
npm install
npm run dev          # http://localhost:5173/rto
```

The dashboard uses simulated hub data for **Sun 04 Oct 2026, 13:45 IST** and saves its state in the browser. Charts are hand-built SVG; the only libraries are React and React Router.

<details>
<summary><b>Optional: the shared store behind <code>/quick-ops</code></b></summary>

`/quick-ops` reads and writes stock and orders through a small Vercel function, [`api/state.js`](api/state.js), backed by Upstash Redis. To turn it on, connect **Upstash for Redis** to the Vercel project (it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`; see [`.env.example`](.env.example)) and redeploy. Without it, the page runs in a clearly labelled demo mode that saves data in the browser.

To test the function locally:

```bash
npm run build
MEESHO_QUICK_MEMORY_STORE=1 node scripts/serve.mjs   # http://localhost:4173
```

This folder also contains an early version of the customer app at `/quick`. The final customer app is in [`Meesho Quick App`](../Meesho%20Quick%20App).
</details>

## Project structure

```text
src/
├── main.jsx               routes
├── lib/engine.js          Valmo-SAVE hold / return engine
├── lib/units.js           units at the hub, buyers and journeys per product
├── data/                  hub numbers, 10 products, shuttles, tasks, notifications
├── state/AppState.jsx     shared state across screens + toasts
├── components/            layout, charts (SVG), panels, UI pieces
├── pages/                 Overview, RtoRetain, SkuDetail, Dispatch, Shelf, QuickOps
└── shared/                stock and order rules used by /quick-ops
api/state.js               optional shared store (Vercel function)
```

## Deploy your own

Import this folder into [Vercel](https://vercel.com/new), set **Root Directory** to `LMDC Dashboard`, keep the Vite defaults, and deploy.

---

<sub>Simulated data for a prototype. Team 52 Saints · IIT Kharagpur · Meesho DICE Challenge 3.0</sub>
