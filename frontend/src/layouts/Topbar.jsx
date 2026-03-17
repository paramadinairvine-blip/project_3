import { useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  HiMenuAlt2,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi';
import { productAPI, transactionAPI, purchaseOrderAPI, supplierAPI, projectAPI } from '../api/endpoints';
import NotificationDropdown from '../components/NotificationDropdown';

const breadcrumbMap = {
  '': 'Dashboard',
  produk: 'Produk',
  tambah: 'Tambah',
  edit: 'Edit',
  kategori: 'Kategori',
  brand: 'Brand',
  supplier: 'Supplier',
  'purchase-order': 'Purchase Order',
  transaksi: 'Transaksi',
  stok: 'Stok',
  opname: 'Opname',
  proyek: 'Proyek',
  laporan: 'Laporan',
  keuangan: 'Keuangan',
  tren: 'Tren',
  pengguna: 'Pengguna',
  'audit-log': 'Audit Log',
  setting: 'Setting',
  satuan: 'Satuan',
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Map parent segment to query config
const entityQueryMap = {
  produk: { key: 'product', fetchFn: (id) => productAPI.getById(id), labelField: 'name' },
  proyek: { key: 'project', fetchFn: (id) => projectAPI.getById(id), labelField: 'name' },
  transaksi: { key: 'transaction', fetchFn: (id) => transactionAPI.getById(id), labelField: 'transactionNumber' },
  'purchase-order': { key: 'purchase-order', fetchFn: (id) => purchaseOrderAPI.getById(id), labelField: 'poNumber' },
  supplier: { key: 'supplier', fetchFn: (id) => supplierAPI.getById(id), labelField: 'name' },
};

// Component that subscribes to React Query cache for UUID resolution
function EntityLabel({ id, parentSeg }) {
  const config = entityQueryMap[parentSeg];
  const { data } = useQuery({
    queryKey: [config.key, id],
    queryFn: async () => { const { data } = await config.fetchFn(id); return data.data; },
    staleTime: 5 * 60 * 1000,
  });

  return data?.[config.labelField] || id;
}

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-gray-700 font-medium text-sm">Dashboard</span>;
  }

  const resolveLabel = (seg, i) => {
    if (breadcrumbMap[seg]) return breadcrumbMap[seg];
    if (UUID_REGEX.test(seg) && i > 0) {
      const parentSeg = segments[i - 1];
      if (entityQueryMap[parentSeg]) {
        return <EntityLabel id={seg} parentSeg={parentSeg} />;
      }
    }
    return decodeURIComponent(seg);
  };

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/" className="text-gray-500 hover:text-blue-600 transition-colors">
        Dashboard
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const label = resolveLabel(seg, i);
        const isLast = i === segments.length - 1;

        return (
          <span key={path} className="flex items-center gap-1.5">
            <span className="text-gray-300">/</span>
            {isLast ? (
              <span className="text-gray-700 font-medium">{label}</span>
            ) : (
              <Link to={path} className="text-gray-500 hover:text-blue-600 transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function Topbar({ collapsed, onToggle, onMobileOpen }) {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={onMobileOpen}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1.5"
          >
            <HiMenuAlt2 className="w-6 h-6" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggle}
            className="hidden lg:flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
          >
            {collapsed ? (
              <HiChevronRight className="w-5 h-5" />
            ) : (
              <HiChevronLeft className="w-5 h-5" />
            )}
          </button>

          {/* Breadcrumbs */}
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <NotificationDropdown />
        </div>
      </div>
    </header>
  );
}
