# Valmo-SAVE

**Team 52 Saints, IIT Kharagpur — Meesho DICE Challenge 3.0, Problem Statement: Reducing RTO**

## Live Prototypes

| Prototype | Intended user | Link |
|---|---|---|
| LMDC Dashboard | Operations team at a Valmo last-mile delivery centre | [valmo-save-lmdc.vercel.app/rto](https://valmo-save-lmdc.vercel.app/rto) |
| Meesho Quick | Customers | [meesho-quick-app.vercel.app](https://meesho-quick-app.vercel.app/) |
| Performance Tracker | Meesho management | [meesho-save-hq.vercel.app](https://meesho-save-hq.vercel.app/?loc=r%3Ancr) |

Meesho Quick is designed for mobile screens and is best viewed on a phone or in a browser's mobile view. Video walkthroughs of all three prototypes are included in this repository.

---

## Summary

When a Meesho order cannot be delivered, it is marked as RTO (return to origin) and sent back to the seller. By then, the forward delivery of about ₹50 has already been spent, and the return journey adds about ₹120 more, a loss of roughly ₹170 per parcel. Yet the parcel has already reached the buyer's region, and a few days later another customer nearby often orders the same product.

Valmo-SAVE holds such a parcel at the destination last-mile delivery centre (LMDC) for up to 21 days and sells it to the next customer within 70 km who orders the same product. A predictive model decides, for every RTO, whether holding is cheaper than returning. Each local resale saves ₹87, and the programme breaks even when 27.5% of held units are resold. In back-testing on unseen data, 48% of held units were resold.

We built the model on approximately 100,000 real e-commerce orders and developed three working prototypes: a dashboard for hub operations, a customer-facing shopping experience (Meesho Quick), and a monitoring dashboard for Meesho management.

## 1. The Problem

An order becomes an RTO when the customer is unavailable, refuses the parcel, or the address cannot be located. The current cost of each RTO is as follows.

| Cost component | Amount |
|---|---|
| Forward delivery (already incurred) | ₹50 |
| Reverse delivery to the seller | ₹120 |
| Total cost per RTO | ₹170 |

Beyond the logistics cost, the seller's inventory and working capital remain locked for several weeks. One seller we interviewed described a product that took seven days to reach the customer and a further seventeen days in the return cycle.

## 2. Research and Validation

Our recommendations are based on four sources of evidence.

| Source | Scope | Key finding |
|---|---|---|
| Primary survey | 146 responses: 137 customers and 9 stakeholders, including sellers, delivery partners and hub staff | Refusal, customer unavailability and address issues account for most failed deliveries. Sellers are affected by locked inventory and cash. |
| Meesho mentor sessions | Discussions on RTO policy and hub operations | RTO shipments not returned to the seller within 45 days are treated as lost. Hubs already support repacking and relabelling, and vehicles already run between hubs. |
| Industry experts | Specialists in logistics, fintech and fraud detection | Route optimisation, RTO prediction and fraud detection are established capabilities that a solution can build on. |
| Data analysis | Approximately 100,000 orders from the public Olist e-commerce dataset (Brazil) | Demand for popular products is local and recurring: 63% of top-product orders around São Paulo fall within 25 km, and 77% within 50 km. |

## 3. Overall Approach

We examined the entire order journey and proposed interventions at each stage. Prevention measures help customers buy with confidence through virtual try-on, size guidance and authentic customer photographs. A commitment step confirms purchase intent before dispatch for high-risk orders. A rescue layer improves the handling of failed delivery attempts and introduces an Attempt Integrity Score that rewards genuine delivery attempts by riders.

These measures reduce failures, but some failures will always occur. Valmo-SAVE addresses what remains: it begins only after an order has been marked as a final RTO. It is our principal solution and the focus of this repository.

## 4. How Valmo-SAVE Works

Valmo-SAVE operates in three steps.

| Step | Description |
|---|---|
| Retain | An eligible parcel is held at the destination LMDC as temporary inventory instead of being sent back. The seller retains ownership; the hub acts only as custodian. |
| Match | The system looks for a new order of the same product, from the same seller and in the same variant, placed by a customer within 70 km. |
| Fulfil | The parcel is relabelled and delivered to the new customer as a fresh sale, using vehicles that already travel between hubs every day. |

If no matching order arrives within the holding period, the parcel is returned to the seller through the normal process.

For example, suppose a kurta fails delivery at the Delhi South hub. Two days later, a customer in Gurgaon Sector 22, 14 km away, orders the same kurta. The held unit is delivered the next day, the ₹120 return journey is avoided, and the sale is recovered.

Several safeguards keep the programme controlled. Each parcel is held for no more than 21 days. A stock cap limits how many units of one product a hub may hold. Participation is on a seller opt-in basis, and fragile or perishable categories are excluded from the initial pilot.

## 5. The Predictive Model

For every RTO, the model answers one question: is holding this parcel expected to cost less than returning it now?

| Stage | Method |
|---|---|
| Local demand | The model estimates daily demand for the product within 70 km of the hub, giving more weight to recent weeks. Products with limited sales history borrow the demand rate of their category. |
| Probability of resale | Because demand is irregular, the model uses a negative binomial distribution: `P(sold by day t) = 1 − (1 + λt / k)^(−k)`. |
| Expected cost of holding | `E[C](T) = ₹50 + ₹25 + ₹0.33 × expected days held + ₹120 × (1 − P(sold by day T))` |
| Decision | The parcel is held if the lowest expected cost over any holding period of up to 21 days is below ₹170. Otherwise it is returned. |
| Stock cap | The n-th unit of a product is held only if the probability of n nearby orders still justifies the cost. |
| Time limit | Every parcel is held for at most the lesser of 21 days and the time remaining under the 45-day rule. |

### Basis for the 70 km radius and the 21-day limit

Both limits were derived from back-testing. Each is the point at which additional distance or time adds little further value, measured three independent ways and rounded up.

| Method | Resale radius | Holding period |
|---|---|---|
| All products, all regions | 65 km | 20.5 days |
| Top 20 products | 70 km | 14.6 days |
| São Paulo metropolitan area | 45 km | 17.6 days |
| Adopted limit | 70 km | 21 days |

At 70 km, 89% of the achievable value is already captured; beyond this distance, buyers tend to be in other cities and freight costs rise by about 43%. Within the 21-day window, holding becomes profitable from day 2, the chance of a sale reaches 50% by day 8, and 70% by day 21.

### Back-test results

The model was trained on earlier months and evaluated on months it had not seen.

| Test set | RTOs evaluated | Result |
|---|---|---|
| Dense metropolitan areas | 8,351 | ₹9.81 saved per RTO; 48% of held units resold |
| All of Brazil | 26,767 | ₹3.54 saved per RTO |

The model is also selective. For 64% of metropolitan RTOs it predicts that a nearby buyer is unlikely and recommends returning the parcel as usual.

## 6. Financial Impact

| Cost per unit | Returned today | Held and resold | Held but not resold |
|---|---|---|---|
| Forward delivery (already incurred) | ₹50 | ₹50 | ₹50 |
| Holding, quality check and relisting | — | ₹33 | ₹33 |
| Transfer between hubs (existing vehicles) | — | ₹0 | ₹0 |
| Reverse delivery | ₹120 | Avoided | ₹120 |
| Total | ₹170 | ₹83 | ₹203 |

Each successful resale saves ₹87 compared with the current process, while each unsold held unit costs ₹33 more. The programme therefore breaks even when 27.5% of held units are resold, compared with 48% achieved in the back-test.

For an illustrative Delhi NCR pilot of 10,000 RTOs over three months, with 70% eligible for holding and 50% of those resold, the expected net saving is approximately ₹1.89 lakh. The result is robust to higher costs: even with an additional ₹10 per unit for transfers, the break-even resale rate rises only to 36%. Shorter holding periods lower the break-even rate further, to 22.5% at three days.

The detailed calculations are available in the [financial model](FINANCIAL%20MODEL_VALMO%20SAVE_ROUND%202.xlsx).

## 7. Meesho Quick

Held units are sold through Meesho Quick, a proposed section of the Meesho app that offers products already located near the customer, with delivery in one to two days. Because delivery is faster than the usual five to seven days, Meesho Quick encourages prepaid orders, which in turn reduces refusals at the door. Products are sold at the original listing price, so there is no discounting and no harm to the seller's brand or margins. As local inventory grows, Meesho Quick can develop into a dedicated fast-delivery section for everyday products.

## 8. Prototypes

The three prototypes represent one connected process: the hub decides what to hold, the customer buys it, and Meesho management monitors performance across all hubs.

| Prototype | Description | Live link | Source code |
|---|---|---|---|
| LMDC Dashboard | Shows a hold or return decision for every failed delivery with the reasoning, the hold shelf with a 21-day countdown for each unit, and the dispatch of resold units to the next shuttle. | [Open](https://valmo-save-lmdc.vercel.app/rto) | [LMDC Dashboard](LMDC%20Dashboard) |
| Meesho Quick | A customer shopping experience for products held nearby: home screen, product listing, product page, cart, checkout with cash on delivery or simulated online payment, and order tracking. An order reserves the exact unit, so it cannot be sold twice. A hub view allows staff to list units after a quality check and to process orders. | [Open](https://meesho-quick-app.vercel.app/) | [Meesho Quick App](Meesho%20Quick%20App) |
| Performance Tracker | A monitoring dashboard for Meesho management. Users select any of 14 LMDCs, a city or the whole country, and a date range, and can view the RTO funnel, resale rate, delivery time, prepaid share, cost saved and inventory age, and act on operational alerts. | [Open](https://meesho-save-hq.vercel.app/?loc=r%3Ancr) | [Performance Tracker](Performance%20Tracker) |

Each prototype folder contains its own README with screen descriptions and setup instructions.

## 9. Implementation Plan

We propose a 90-day pilot in Delhi NCR before expanding to other cities.

| Period | Phase | Activities |
|---|---|---|
| Days 0–30 | Set up | Select two to three high-RTO hubs in Delhi NCR, align delivery partners, establish quality-check and tagging processes, and deploy the dashboards. |
| Days 31–60 | Pilot | Apply hold or return decisions to live RTOs, list held units on Meesho Quick, and track resale rate, delivery time, prepaid share and cost saved. |
| Days 61–90 | Validate and prepare to scale | Evaluate results against targets, refine rules by product, and prepare a rollout plan for Mumbai, Bengaluru and Hyderabad. |

The programme benefits every stakeholder. Sellers recover their sales sooner without lowering prices, customers receive products within one to two days, hubs handle fewer return shipments, and Meesho reduces logistics costs while gaining a new fast-delivery offering.

## 10. Repository Contents

| File or folder | Description |
|---|---|
| [Prediction_Model.ipynb](Prediction_Model.ipynb) | The complete analysis: merging the nine Olist tables, local demand mapping, the hold or return model, back-testing, and the radius and holding-period analysis |
| [Olist (Brazillian ECom Marketplace)_DataSets](Olist%20%28Brazillian%20ECom%20Marketplace%29_DataSets) | The public dataset of approximately 100,000 orders, used as a proxy for Meesho data |
| [CALCULATIONS (RADIUS & DAYS)_VALMO SAVE_ROUND 2.xlsx](CALCULATIONS%20%28RADIUS%20%26%20DAYS%29_VALMO%20SAVE_ROUND%202.xlsx) | Detailed workings for the 70 km radius and the 21-day holding limit |
| [FINANCIAL MODEL_VALMO SAVE_ROUND 2.xlsx](FINANCIAL%20MODEL_VALMO%20SAVE_ROUND%202.xlsx) | Unit economics, break-even analysis and sensitivity analysis |
| [Survey Response Sheet Valmo.xlsx](Survey%20Response%20Sheet%20Valmo.xlsx) | 146 survey responses from customers and stakeholders |
| [LMDC Dashboard](LMDC%20Dashboard) | Source code for the hub operations dashboard |
| [Meesho Quick App](Meesho%20Quick%20App) | Source code for the customer application |
| [Performance Tracker](Performance%20Tracker) | Source code for the management dashboard |
| [Valmo-SAVE Prototype Walkthrough.mp4](Valmo-SAVE%20Prototype%20Walkthrough.mp4) | Video walkthrough of the LMDC Dashboard |
| [Meesho_Quick_Walkthrough.mp4](Meesho_Quick_Walkthrough.mp4) | Video walkthrough of Meesho Quick |
| [Performance Tracker_Walkthrough.mp4](Performance%20Tracker_Walkthrough.mp4) | Video walkthrough of the Performance Tracker |

## 11. Running the Project

**Predictive model.** Open `Prediction_Model.ipynb` in Jupyter or Google Colab, keep the Olist CSV files in their folder, and run all cells. The notebook requires Python 3 with pandas, NumPy, SciPy and scikit-learn.

**Prototypes.** Each prototype is a React application built with Vite and requires Node.js 18 or later. To run one locally:

```bash
cd "Meesho Quick App"
npm install
npm run dev
```

Replace the folder name with `LMDC Dashboard` or `Performance Tracker` as required, then open http://localhost:5173. To deploy a prototype, import this repository into Vercel and set the Root Directory to the relevant folder. No environment variables are required.

## 12. Assumptions and Limitations

The Olist dataset from Brazil was used as a proxy because Meesho order data is not publicly available. Absolute savings will therefore differ, although the method applies unchanged and would be re-run on Meesho data for the pilot.

The forward and reverse delivery costs of ₹50 and ₹120 are taken from the case material provided. The holding cost of ₹30–33 per unit is estimated from public benchmarks for storage, handling and wages. Distances are measured in a straight line; road distances are typically 20–30% longer. Transfers between hubs within 70 km are assumed to use existing vehicle runs at no additional cost, and the sensitivity analysis above shows the effect if this does not hold.

The prototypes use simulated or illustrative data, and all payments are simulated. The 21-day holding period is a pilot parameter, to be refined by product category using actual sales data.

---

Team 52 Saints: Priyanshu Raj, Bhawesh Kukreja and Dhruv Anil Rai, IIT Kharagpur. Submitted for Meesho DICE Challenge 3.0.
