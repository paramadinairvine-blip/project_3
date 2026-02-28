import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loading } from './components/common';
import ProtectedRoute from './layouts/ProtectedRoute';
import POSLayout from './layouts/POSLayout';
import { ROLES } from './utils/constants';

const Login = lazy(() => import('./pages/Login'));
const Cashier = lazy(() => import('./pages/Cashier'));
const Checkout = lazy(() => import('./pages/Checkout'));
const History = lazy(() => import('./pages/History'));
const StockCheck = lazy(() => import('./pages/StockCheck'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const allowedRoles = [ROLES.ADMIN, ROLES.OPERATOR];

export default function App() {
  return (
    <Suspense fallback={<Loading fullPage text="Memuat..." />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <POSLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/kasir" element={<Cashier />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/riwayat" element={<History />} />
          <Route path="/cek-stok" element={<StockCheck />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route path="/" element={<Navigate to="/kasir" replace />} />
        <Route path="*" element={<Navigate to="/kasir" replace />} />
      </Routes>
    </Suspense>
  );
}
