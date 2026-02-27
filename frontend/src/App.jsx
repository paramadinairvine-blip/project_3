import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './layouts/ProtectedRoute';
import { Loading } from './components/common';
import { ROLES } from './utils/constants';

// ─── Lazy‑loaded pages ───────────────────────────────
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const ProductList = lazy(() => import('./pages/products/ProductList'));
const ProductForm = lazy(() => import('./pages/products/ProductForm'));
const ProductDetail = lazy(() => import('./pages/products/ProductDetail'));

const CategoryList = lazy(() => import('./pages/categories/CategoryList'));

const SupplierList = lazy(() => import('./pages/suppliers/SupplierList'));
const SupplierForm = lazy(() => import('./pages/suppliers/SupplierForm'));
const PurchaseOrderList = lazy(() => import('./pages/suppliers/PurchaseOrderList'));
const PurchaseOrderForm = lazy(() => import('./pages/suppliers/PurchaseOrderForm'));
const PurchaseOrderDetail = lazy(() => import('./pages/suppliers/PurchaseOrderDetail'));

const TransactionList = lazy(() => import('./pages/transactions/TransactionList'));
const TransactionForm = lazy(() => import('./pages/transactions/TransactionForm'));
const TransactionDetail = lazy(() => import('./pages/transactions/TransactionDetail'));

const StockOverview = lazy(() => import('./pages/stock/StockOverview'));
const StockOpname = lazy(() => import('./pages/stock/StockOpname'));

const ProjectList = lazy(() => import('./pages/projects/ProjectList'));
const ProjectForm = lazy(() => import('./pages/projects/ProjectForm'));
const ProjectDetail = lazy(() => import('./pages/projects/ProjectDetail'));

const StockReport = lazy(() => import('./pages/reports/StockReport'));
const FinancialReport = lazy(() => import('./pages/reports/FinancialReport'));
const TrendReport = lazy(() => import('./pages/reports/TrendReport'));

const UserList = lazy(() => import('./pages/users/UserList'));
const UserForm = lazy(() => import('./pages/users/UserForm'));
const AuditLog = lazy(() => import('./pages/audit/AuditLog'));

const UnitList = lazy(() => import('./pages/settings/UnitList'));

// ─── Suspense wrapper ────────────────────────────────
function PageLoader() {
  return <Loading text="Memuat halaman..." className="min-h-[60vh]" />;
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard — semua role */}
          <Route index element={<Dashboard />} />

          {/* Produk — semua role bisa lihat */}
          <Route path="produk" element={<ProductList />} />
          <Route path="produk/tambah" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <ProductForm />
            </ProtectedRoute>
          } />
          <Route path="produk/:id" element={<ProductDetail />} />
          <Route path="produk/:id/edit" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <ProductForm />
            </ProtectedRoute>
          } />

          {/* Kategori */}
          <Route path="kategori" element={<CategoryList />} />

          {/* Supplier */}
          <Route path="supplier" element={<SupplierList />} />
          <Route path="supplier/tambah" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <SupplierForm />
            </ProtectedRoute>
          } />
          <Route path="supplier/:id/edit" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <SupplierForm />
            </ProtectedRoute>
          } />

          {/* Purchase Order */}
          <Route path="purchase-order" element={<PurchaseOrderList />} />
          <Route path="purchase-order/tambah" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <PurchaseOrderForm />
            </ProtectedRoute>
          } />
          <Route path="purchase-order/:id" element={<PurchaseOrderDetail />} />
          <Route path="purchase-order/:id/edit" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <PurchaseOrderForm />
            </ProtectedRoute>
          } />

          {/* Transaksi */}
          <Route path="transaksi" element={<TransactionList />} />
          <Route path="transaksi/tambah" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <TransactionForm />
            </ProtectedRoute>
          } />
          <Route path="transaksi/:id" element={<TransactionDetail />} />

          {/* Stok */}
          <Route path="stok" element={<StockOverview />} />
          <Route path="stok/opname" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <StockOpname />
            </ProtectedRoute>
          } />

          {/* Proyek */}
          <Route path="proyek" element={<ProjectList />} />
          <Route path="proyek/tambah" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <ProjectForm />
            </ProtectedRoute>
          } />
          <Route path="proyek/:id" element={<ProjectDetail />} />
          <Route path="proyek/:id/edit" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <ProjectForm />
            </ProtectedRoute>
          } />

          {/* Laporan */}
          <Route path="laporan/stok" element={<StockReport />} />
          <Route path="laporan/keuangan" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.VIEWER]}>
              <FinancialReport />
            </ProtectedRoute>
          } />
          <Route path="laporan/tren" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.VIEWER]}>
              <TrendReport />
            </ProtectedRoute>
          } />

          {/* Pengguna — ADMIN only */}
          <Route path="pengguna" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <UserList />
            </ProtectedRoute>
          } />
          <Route path="pengguna/tambah" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <UserForm />
            </ProtectedRoute>
          } />

          {/* Audit Log — ADMIN only */}
          <Route path="audit-log" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <AuditLog />
            </ProtectedRoute>
          } />

          {/* Setting */}
          <Route path="setting/satuan" element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.OPERATOR]}>
              <UnitList />
            </ProtectedRoute>
          } />

          {/* 404 catch-all inside layout */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* 404 catch-all outside layout */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
