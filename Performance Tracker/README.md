# Performance Tracker

**Live application:** [meesho-save-hq.vercel.app](https://meesho-save-hq.vercel.app/?loc=r%3Ancr)

This directory contains the source code of the Performance Tracker, the management prototype of Valmo-SAVE, developed by Team 52 Saints, IIT Kharagpur, for Meesho DICE Challenge 3.0. A video walkthrough is available in the parent directory as [Performance Tracker_Walkthrough.mp4](../Performance%20Tracker_Walkthrough.mp4).

## About the Application

The Performance Tracker is a monitoring dashboard for Meesho officials who oversee Valmo-SAVE across the delivery network. Under Valmo-SAVE, a parcel that could not be delivered is held at the destination last-mile delivery centre (LMDC), listed on Meesho Quick and sold to a nearby customer instead of being returned to the seller. The dashboard shows how this process performs at every LMDC, highlights where attention is needed, and allows managers to record the action taken.

The dashboard is organised around three tasks. Managers first select a location and a period, then monitor the key indicators and the stages of the resale process, and finally act on operational alerts. The layout follows the monitoring dashboard presented in our submission deck.

| Task | Description |
|---|---|
| Select | Choose any of 14 LMDCs across six cities, an entire city, or all of India, together with a period: August 2026, September 2026, October 2026 to date, the last 7 or 30 days, or a custom date range. The selection is stored in the web address, so any view can be shared as a link. |
| Monitor | Review six key indicators, the RTO funnel, the sell-through trend, the age of inventory on hold, category performance and a comparison of LMDCs. Selecting any indicator or funnel stage shows its breakdown by LMDC or by product category. |
| Act | Review alerts on ageing inventory, low sell-through, quality-check rejections, slow delivery and shelf capacity. Each alert includes a recommended action, which can be confirmed with a note and marked as resolved. |

## Key Indicators

The default view shows Delhi NCR – Okhla for September 2026, consistent with the figures in our submission deck.

| Indicator | Default value | Definition |
|---|---|---|
| Total RTO received | 12,480 | Failed deliveries received at the LMDC |
| Eligible for SAVE | 8,960 (72%) | Units the model selected for holding |
| Sold via Meesho Quick | 6,720 (75% of eligible) | Held units sold to a nearby customer |
| Average delivery time | 1.8 days | Delivery time for Valmo-SAVE orders, compared with about 3 days for regular orders |
| Prepaid share | 82% | Proportion of Valmo-SAVE orders paid online |
| Reverse cost saved | ₹8.1 lakh | ₹120 return journey avoided for each unit sold |

## Pages

| Page | Route | Description |
|---|---|---|
| VALMO-SAVE | `/` | The main dashboard: key indicators, RTO funnel, sell-through trend, inventory health, top categories, LMDC-wise performance, and alerts and actions |
| Overview | `/overview` | Performance of each city, reverse cost saved by city, and a ranking of all LMDCs by sell-through |
| LMDC Performance | `/lmdcs` | A comparison of all LMDCs with sorting, search, filtering by city and export to CSV |
| Inventory | `/inventory` | Units on hold grouped by age (0–7, 8–14 and 15–21 days, and past 21 days) and shelf capacity at each LMDC |
| Orders | `/orders` | Sample Meesho Quick orders, filterable by status and payment method |
| Issues and Alerts | `/alerts` | All alerts with severity and recommended action, and the option to resolve or reopen each one |
| Reports | `/reports` | CSV downloads of the full report, performance summary, LMDC comparison, category performance and alert log |
| Settings | `/settings` | Thresholds that determine when an alert is raised |

Examples of shareable views:

| Link | View |
|---|---|
| `/?loc=noida&period=oct-2026` | Noida, October 2026 to date |
| `/?loc=r:mum&period=sep-2026` | All Mumbai LMDCs, September 2026 |
| `/overview?loc=all` | All of India |

## Directory Structure

```text
Performance Tracker/
├── public/
│   └── favicon.svg           Application icon
├── src/
│   ├── main.jsx              Application entry point and route definitions
│   ├── state.jsx             Location and period filters, alert status, settings and notifications
│   ├── styles.css            Application styles
│   ├── data/
│   │   ├── model.js          LMDCs, cities, daily data generation, indicators, inventory and alert rules
│   │   └── reports.js        CSV report generation
│   ├── components/
│   │   ├── Layout.jsx        Sidebar navigation, page header and location and period selectors
│   │   ├── Charts.jsx        Funnel, line, donut and bar charts
│   │   ├── AlertAction.jsx   Dialog for confirming and resolving alerts
│   │   └── ui.jsx            Shared interface components and icons
│   └── pages/
│       ├── Save.jsx          Main VALMO-SAVE dashboard
│       ├── Network.jsx       Overview, LMDC Performance and Inventory pages
│       └── Ops.jsx           Orders, Issues and Alerts, Reports and Settings pages
├── index.html                HTML entry page
├── package.json              Project dependencies and scripts
├── vercel.json               Deployment routing configuration
└── vite.config.js            Build configuration
```

## Data

The dashboard uses illustrative data for a pilot, not live Meesho data. Daily figures for each LMDC from 1 August to 20 October 2026 are generated with a fixed seed, so every combination of location and period produces consistent results. The status of alerts and any changes to alert thresholds are saved in the viewer's browser. No server, database or credentials are required.

## Running Locally

The application is built with React 18 and Vite, and requires Node.js 18 or later.

```bash
cd "Performance Tracker"
npm install
npm run dev
```

Open http://localhost:5173 in a browser.

## Deployment

Import the repository into Vercel, set the Root Directory to `Performance Tracker`, and retain the default Vite settings. No environment variables are required.

## Notes

This is a prototype intended to demonstrate how Meesho could monitor Valmo-SAVE across its network. The figures are illustrative, and the Orders page shows sample records.

---

Team 52 Saints: Priyanshu Raj, Bhawesh Kukreja and Dhruv Anil Rai, IIT Kharagpur. Submitted for Meesho DICE Challenge 3.0. See the [main README](../README.md) for the full project.
