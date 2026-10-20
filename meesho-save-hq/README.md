# Valmo-SAVE · Live Monitoring Dashboard (for Meesho officials)

Team 52 Saints · IIT Kharagpur · Meesho DICE Challenge 3.0

A clickable web dashboard for Meesho managers to track Valmo-SAVE at every LMDC: how many failed deliveries (RTOs) come in, how many are eligible to hold, how many are listed on Meesho Quick, and how many are resold locally. **Select → Monitor → Act.**

> All numbers are illustrative pilot data, generated deterministically so every filter combination is consistent. The default view (Delhi NCR – Okhla, September 2026) matches the figures in our deck.

## What you can do

- **Select** any LMDC, a whole region or All India, and a period (Aug, Sep, Oct month-to-date, last 7 or 30 days, or a custom range). The choice is kept in the URL, so any view can be shared as a link.
- **Monitor** six KPIs, the RTO funnel (RTO received → eligible for SAVE → pushed to Meesho Quick → sold), the weekly sell-through trend, current inventory ageing, top categories and an LMDC comparison.
- **Drill down**: click any KPI or funnel stage for a breakdown by LMDC (or by category for a single LMDC). Click any LMDC row to open it.
- **Act** on alerts (ageing stock past 21 days, low sell-through, QC rejections, slow delivery, full shelves): confirm the recommended action with a note, and it is marked resolved. Thresholds are editable in Settings.
- **Download** CSV reports for the selected view.

| Page | Route |
|---|---|
| VALMO-SAVE (main dashboard) | `/` |
| Network overview (regions, leaderboard) | `/overview` |
| LMDC performance (sortable comparison) | `/lmdcs` |
| Inventory (ageing and shelf capacity) | `/inventory` |
| Meesho Quick orders (sample records) | `/orders` |
| Issues & alerts | `/alerts` |
| Reports (CSV downloads) | `/reports` |
| Settings (alert thresholds) | `/settings` |

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

No backend, API keys or environment variables are needed. Alert status and thresholds are saved in the viewer's browser.

## Structure

```
src/data/model.js      LMDCs, regions, seeded daily data, metrics, inventory, alerts, sample orders
src/data/reports.js    CSV report builders
src/state.jsx          URL filters (location, period), alerts state, settings, toasts
src/components/        layout (sidebar, filters), charts (funnel, line, donut, bars), UI pieces
src/pages/             Save (main), Network (overview, LMDC performance, inventory), Ops (orders, alerts, reports, settings)
```
