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
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppStateProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="rto" element={<RtoRetain />} />
            <Route path="sku/:skuId" element={<SkuDetail />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="shelf" element={<Shelf />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AppStateProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
