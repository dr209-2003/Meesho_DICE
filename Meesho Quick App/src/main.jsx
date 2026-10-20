import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SharedStoreProvider } from './shared/SharedStore';
import Shell, { QuickProvider } from './screens/App';
import { Home, QuickStore, Categories, Category, Search } from './screens/Browse';
import Product from './screens/Product';
import { Cart, Checkout } from './screens/Checkout';
import { Orders, OrderDetail, Account } from './screens/Orders';
import Hub from './screens/Hub';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SharedStoreProvider>
        <QuickProvider>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Home />} />
              <Route path="quick" element={<QuickStore />} />
              <Route path="categories" element={<Categories />} />
              <Route path="category/:catId" element={<Category />} />
              <Route path="search" element={<Search />} />
              <Route path="p/:id" element={<Product />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="orders" element={<Orders />} />
              <Route path="order/:id" element={<OrderDetail />} />
              <Route path="account" element={<Account />} />
              <Route path="hub" element={<Hub />} />
              <Route path="*" element={<Home />} />
            </Route>
          </Routes>
        </QuickProvider>
      </SharedStoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
