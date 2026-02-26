import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  HiMenuAlt2,
  HiChevronLeft,
  HiChevronRight,
  HiBell,
  HiUser,
  HiKey,
  HiLogout,
  HiChevronDown,
} from 'react-icons/hi';
import useAuth from '../hooks/useAuth';
import { ROLE_LABELS } from '../utils/constants';

// Breadcrumb label map
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

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

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700 leading-tight">
                  {user?.fullName || 'User'}
                </p>
                <p className="text-xs text-gray-500 leading-tight">
                  {ROLE_LABELS[user?.role] || user?.role}
                </p>
              </div>
              <HiChevronDown className="hidden md:block w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50">
                {/* User info (mobile) */}
                <div className="md:hidden px-4 py-2.5 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-700">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profil');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <HiUser className="w-4 h-4 text-gray-400" />
                  Profil Saya
                </button>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/ganti-password');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <HiKey className="w-4 h-4 text-gray-400" />
                  Ganti Password
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <HiLogout className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
