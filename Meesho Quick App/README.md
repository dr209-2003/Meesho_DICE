# Meesho Quick

**Live application:** [meesho-quick-app.vercel.app](https://meesho-quick-app.vercel.app/)

This directory contains the source code of Meesho Quick, the customer-facing prototype of Valmo-SAVE, developed by Team 52 Saints, IIT Kharagpur, for Meesho DICE Challenge 3.0. The application is designed for mobile screens and is best viewed on a phone or in a browser's mobile view. A video walkthrough is available in the parent directory as [Meesho_Quick_Walkthrough.mp4](../Meesho_Quick_Walkthrough.mp4).

## About the Application

Meesho Quick is a proposed section of the Meesho app that sells products already located near the customer. Under Valmo-SAVE, a parcel that could not be delivered is held at the destination last-mile delivery centre (LMDC) instead of being returned to the seller. After passing a quality check, it is offered on Meesho Quick to customers within 70 km and delivered within one to two days. Products are sold at the original listing price, so the seller's brand and margins are protected, while the ₹120 cost of the return journey is avoided.

The interface follows the Meesho Quick screens presented in our submission deck. The application covers the complete customer journey, from discovering nearby products to placing an order and tracking its delivery. It also includes a hub view through which LMDC staff list held units and process orders, so that the full process can be demonstrated end to end.

## Screens

| Screen | Route | Description |
|---|---|---|
| Home | `/` | Search, wishlist, cart, the Meesho Quick banner, product categories, service highlights and featured deals |
| Meesho Quick store | `/quick` | Products held at the nearby hub, with the delivery pincode, quick filters (Available Today, 1–2 Days, Prepaid Only, Local Stock), category tabs, sorting and recently sold-out items |
| Product page | `/p/:id` | Product images, local availability and delivery estimate, price, prepaid delivery option, size and quantity selection, Add to Cart and Buy Now |
| Cart | `/cart` | Quantity changes, stock warnings and price details |
| Checkout | `/checkout` | Delivery address form, cash on delivery or simulated online payment, and order summary |
| Order confirmation and tracking | `/order/:id` | Order status from placement to delivery, with the option to cancel |
| Order history | `/orders` | All orders placed from the device |
| Categories and search | `/categories`, `/category/:id`, `/search` | Browsing by category and search by keyword or product ID |
| Account | `/account` | Customer details, delivery location and wishlist |
| Hub view | `/hub` | For LMDC staff: retain a failed delivery, complete the quality check, and pack and dispatch customer orders |

## Key Features

| Feature | Description |
|---|---|
| Local availability | A product is shown on Meesho Quick only when a quality-checked unit is held at the hub and the customer is within 70 km. |
| Reservation | Placing an order reserves the specific unit, so the same unit cannot be sold to two customers. |
| Price integrity | Products are sold at the original listing price, without discounting. |
| Prepaid preference | Online payment is suggested by default for faster delivery from local inventory, which reduces refusals at delivery. |
| Connected hub view | Units listed in the hub view appear in the store, and order status updates made by the hub are reflected in the customer's tracking page. |
| Simulated payment | Online payment is simulated and clearly labelled. No card, UPI or bank details are collected. |

## Directory Structure

```text
Meesho Quick App/
├── api/
│   └── state.js              Serverless function for the optional shared data store
├── public/
│   ├── favicon.svg           Application icon
│   └── img/                  Product photographs, category icons and banner artwork
├── scripts/
│   └── serve.mjs             Local server for testing the production build with the API
├── src/
│   ├── main.jsx              Application entry point and route definitions
│   ├── app.css               Application styles
│   ├── lib/
│   │   └── engine.js         Valmo-SAVE hold or return decision model
│   ├── screens/
│   │   ├── App.jsx           Application shell, navigation, cart and customer state
│   │   ├── Browse.jsx        Home, Meesho Quick store, categories and search
│   │   ├── Product.jsx       Product page
│   │   ├── Checkout.jsx      Cart, checkout and simulated payment
│   │   ├── Orders.jsx        Order tracking, order history and account
│   │   ├── Hub.jsx           Hub view for LMDC staff
│   │   └── ui.jsx            Shared interface components and icons
│   └── shared/
│       ├── catalog.js        Product catalogue, delivery areas and policy limits
│       ├── ops.js            Inventory, reservation and order rules
│       └── SharedStore.jsx   Data access layer with local storage fallback
├── .env.example              Template for the optional data store credentials
├── index.html                HTML entry page
├── package.json              Project dependencies and scripts
├── vercel.json               Deployment routing configuration
└── vite.config.js            Build configuration
```

## Data Storage

The application runs in one of two modes.

| Mode | Configuration | Behaviour |
|---|---|---|
| Demonstration (default) | None required | Inventory and orders are stored in the browser. The hub view in another tab of the same browser remains synchronised. A notice at the top of the screen indicates this mode. |
| Shared | Upstash Redis connected in Vercel | Inventory and orders are stored centrally through `api/state.js` and shared across all devices. Order placement uses an atomic update so that the last unit cannot be sold twice. |

To enable the shared mode, connect an Upstash Redis database to the Vercel project. This sets the environment variables `KV_REST_API_URL` and `KV_REST_API_TOKEN`, as described in `.env.example`. These credentials are used only on the server and are never sent to the browser.

## Running Locally

The application is built with React 18 and Vite, and requires Node.js 18 or later.

```bash
cd "Meesho Quick App"
npm install
npm run dev
```

Open http://localhost:5173 in a browser. To test the production build together with the shared data store, run:

```bash
npm run build
MEESHO_QUICK_MEMORY_STORE=1 npm run serve
```

and open http://localhost:4173.

## Deployment

Import the repository into Vercel, set the Root Directory to `Meesho Quick App`, and retain the default Vite settings. No environment variables are required for the demonstration mode.

## Notes

This is a prototype. Payments, delivery dates and tracking updates are simulated, and the product catalogue is a small demonstration set. Product photographs are taken from the mock-ups in our submission deck.

---

Team 52 Saints: Priyanshu Raj, Bhawesh Kukreja and Dhruv Anil Rai, IIT Kharagpur. Submitted for Meesho DICE Challenge 3.0. See the [main README](../README.md) for the full project.
