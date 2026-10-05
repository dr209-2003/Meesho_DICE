# Valmo-SAVE

**Turning a final RTO into a local sale instead of a return trip**

Team 52 Saints · IIT Kharagpur · Meesho DICE Challenge 3.0 (Round 2) · Problem statement: *Reducing RTO*

**Live prototype:** [valmo-save-lmdc.vercel.app/rto](https://valmo-save-lmdc.vercel.app/rto)

---

## The problem

When a Meesho order cannot be delivered, it becomes an RTO (return to origin). The parcel then travels all the way back to the seller. By that point the forward delivery (about ₹50) has already been spent, and the return adds roughly ₹120 more. That is **₹170 for every RTO** with nothing to show for it. Meanwhile, someone a few kilometres from the same hub often orders that same product a few days later.

## Our solution

Valmo-SAVE stops sending the parcel back straight away. It **holds the RTO at the destination last-mile delivery centre (LMDC)** and **resells it to the next customer who orders the same product nearby**.

The policy in one line:

> Hold a final RTO at the LMDC for **at most 21 days** (and never past Meesho's 45-day lost-shipment rule). Resell it to a buyer of the same product **within 70 km of the hub**. If no buyer comes in time, return it to the seller as usual.

For every RTO, a prediction model decides **Hold** or **Return**:

1. **Local demand.** The model estimates how often the same product is ordered within 70 km of the hub, using recent order history. Demand is bursty, so it uses a negative-binomial model that is recalibrated monthly.
2. **Chance of resale.** From that demand rate, it estimates the probability that a local buyer appears on each day of the hold.
3. **Decision.** It holds the unit only if the expected cost of holding is lower than returning it now:
   - expected cost of holding = holding cost + (chance of no buyer × return cost)
   - cost of returning now = ₹170
4. **Safety limits.** It caps the hold at min(21 days, days left before the 45-day rule). It also limits how many units of the same product one hub keeps.

The 21-day and 70 km limits are not arbitrary. Each is the point of diminishing returns (the "elbow") found three independent ways, then rounded up so that every group sits at or past its own elbow:

| Method | Resale radius | Holding cap |
|---|---|---|
| All products, all regions | 65 km | 20.5 days |
| Top-20 products | 70 km | 14.6 days |
| São Paulo metro (densest market) | 45 km | 17.6 days |
| **Final cap** | **70 km** | **21 days** |

## Key numbers

| Metric | Value |
|---|---|
| Cost of an RTO today | ₹170 (₹50 forward + ₹120 reverse) |
| Cost to hold one product for up to 21 days | ₹30–33 |
| Saving on every product resold locally | ₹87–90 |
| Breakeven: held products that must resell | **25–28 out of 100** |
| Extra network cost (LMDC ↔ LMSC transfer) | ₹0: existing vehicles already run back and forth |
| Back-test on unseen months, dense metros (8,351 RTOs) | ₹9.81 saved per RTO; 48% of held units resold |
| Back-test on unseen months, all of Brazil (26,767 RTOs) | ₹3.54 saved per RTO |

All results come from replaying real orders from the Olist Brazilian e-commerce dataset (2017–18) as a stand-in for Meesho data. Every delivered order is treated as if it were an RTO at its delivery date. The model is trained on earlier months and scored on months it never saw. For the Delhi NCR pilot, the same pipeline would be re-run on Meesho's own orders.

## Live prototype

**[valmo-save-lmdc.vercel.app/rto](https://valmo-save-lmdc.vercel.app/rto)**

This is the dashboard an LMDC operator would use. It shows:
- incoming RTOs with the engine's Hold or Return decision
- the hold shelf, with a countdown for each unit
- resale dispatch to the LMSC
- product-level demand and resale charts
- daily tasks and alerts

A screen-recorded walkthrough is included in this repository.

## Repository contents

| File / folder | What it is |
|---|---|
| [`Prediction_Model.ipynb`](Prediction_Model.ipynb) | Full pipeline: data preparation, demand model, Hold/Return engine, back-test and radius/holding-time analysis |
| [`Olist (Brazillian ECom Marketplace)_DataSets/`](<Olist (Brazillian ECom Marketplace)_DataSets>) | Public Olist dataset used as the Meesho proxy |
| [`CALCULATIONS (RADIUS & DAYS)_VALMO SAVE_ROUND 2.xlsx`](<CALCULATIONS (RADIUS & DAYS)_VALMO SAVE_ROUND 2.xlsx>) | Step-by-step workings for the 70 km radius and 21-day cap, with formulas and charts |
| [`FINANCIAL MODEL_VALMO SAVE_ROUND 2.xlsx`](<FINANCIAL MODEL_VALMO SAVE_ROUND 2.xlsx>) | Holding-cost build-up and breakeven per 100 held products |
| [`Survey Response Sheet Valmo.xlsx`](<Survey Response Sheet Valmo.xlsx>) | Primary survey responses collected by the team |
| [`LMDC Website (Working Prototype)/`](<LMDC Website (Working Prototype)>) | Source code of the dashboard (React + Vite, deployed on Vercel) |
| [`Valmo-SAVE Prototype Walkthrough.mp4`](<Valmo-SAVE Prototype Walkthrough.mp4>) | Video walkthrough of the prototype |

## Running it locally

**Notebook:** open `Prediction_Model.ipynb` in Jupyter or Google Colab, keep the Olist CSVs in the folder above, and run all cells (Python 3 with pandas, NumPy, SciPy and scikit-learn).

**Prototype:**
```bash
cd "LMDC Website (Working Prototype)"
npm install
npm run dev
```

## Assumptions and limitations

- Olist (Brazil) data stands in for Meesho, so absolute savings will differ. The method carries over unchanged.
- Costs: ₹50 forward and ₹120 reverse (from the case pack); holding cost of ₹30–33 is based on public storage, handling and wage benchmarks.
- Distances are straight-line; road distances are typically 20–30% longer.
- Moving a unit between hubs within 70 km is assumed to use existing LMDC ↔ LMSC vehicle runs at no extra cost.

---

*Team 52 Saints, IIT Kharagpur. Submission for Meesho DICE Challenge 3.0.*
