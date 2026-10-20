import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppStateProvider } from './state/AppState';
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import RtoRetain from './pages/RtoRetain';
import SkuDetail from './pages/SkuDetail';
import Dispatch from './pages/Dispatch';
import Shelf from './pages/Shelf';
import { TasksPage, NotificationsPage } from './pages/Simple';
import NotFound from './pages/NotFound';
import QuickOps from './pages/QuickOps';
import { SharedStoreProvider } from './shared/SharedStore';
import QuickShell, { QuickProvider } from './quick/QuickApp';
import { Home, Categories, Category, QuickStore, Search } from './quick/Browse';
import Product from './quick/Product';
import { Cart, Checkout } from './quick/Checkout';
import { Orders, OrderDetail, Account } from './quick/Orders';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SharedStoreProvider>
      <AppStateProvider>
        <Routes>
          <Route path="quick" element={<QuickProvider><QuickShell /></QuickProvider>}>
            <Route index element={<Home />} />
            <Route path="categories" element={<Categories />} />
            <Route path="category/:catId" element={<Category />} />
            <Route path="near-you" element={<QuickStore />} />
            <Route path="search" element={<Search />} />
            <Route path="p/:id" element={<Product />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<Orders />} />
            <Route path="order/:id" element={<OrderDetail />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<Home />} />
          </Route>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="rto" element={<RtoRetain />} />
            <Route path="sku/:skuId" element={<SkuDetail />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="shelf" element={<Shelf />} />
            <Route path="quick-ops" element={<QuickOps />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AppStateProvider>
      </SharedStoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
