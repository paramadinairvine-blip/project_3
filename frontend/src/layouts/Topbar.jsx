import { useLocation, Link } from 'react-router-dom';
import {
  HiMenuAlt2,
  HiChevronLeft,
  HiChevronRight,
  HiBell,
} from 'react-icons/hi';

const breadcrumbMap = {
  '': 'Dashboard',
  produk: 'Produk',
  tambah: 'Tambah',
  edit: 'Edit',
  kategori: 'Kategori',
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

function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-gray-700 font-medium text-sm">Dashboard</span>;
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/" className="text-gray-500 hover:text-blue-600 transition-colors">
        Dashboard
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const label = breadcrumbMap[seg] || decodeURIComponent(seg);
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
          {/* Notification bell */}
          <button className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg p-2 transition-colors">
            <HiBell className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
