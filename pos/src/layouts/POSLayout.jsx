import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { HiCash, HiClipboardList, HiCube, HiChartBar, HiPrinter, HiLogout, HiChevronRight } from 'react-icons/hi';
import { useQueryClient } from '@tanstack/react-query';
import useAuth from '../hooks/useAuth';
import useHoldStore from '../stores/holdStore';
import useCartStore from '../stores/cartStore';
import { ROLE_LABELS, STORE_INFO } from '../utils/constants';
import PrinterSettingModal from '../components/PrinterSettingModal';

const navItems = [
  { to: '/kasir', label: 'Kasir', icon: HiCash },
  { to: '/riwayat', label: 'Riwayat', icon: HiClipboardList },
  { to: '/cek-stok', label: 'Cek Stok', icon: HiCube },
  { to: '/dashboard', label: 'Dashboard', icon: HiChartBar },
];

export default function POSLayout() {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogoClick = () => {
    navigate('/kasir');
    queryClient.invalidateQueries();
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    try {
      await logout();
    } catch {
      // ignore logout API errors
    }
    // Clear hold dan cart data saat logout
    useHoldStore.getState().clearAllHolds();
    useCartStore.getState().clearCart();
    window.location.href = '/login';
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-gray-900 text-white shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: Logo + Institution badge */}
          <button onClick={handleLogoClick} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-2.5">
              <img src="/logo-white.svg" alt="Logo" className="w-8 h-8" />
              <div className="hidden sm:flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">{STORE_INFO.SHORT_NAME}</span>
                <span className="px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-semibold rounded tracking-wider">
                  {STORE_INFO.SUBTITLE}
                </span>
              </div>
            </div>
          </button>

          {/* Center: Navigation tabs */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right: Profile menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 hover:bg-gray-800 rounded-lg px-2 py-1.5 transition-colors"
            >
              <span className="hidden sm:block text-right">
                <span className="text-xs font-medium leading-tight block">{user?.fullName || 'User'}</span>
                <span className="text-[10px] text-gray-400 block">{ROLE_LABELS[user?.role] || user?.role}</span>
              </span>
              <div className="w-9 h-9 bg-cyan-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                {user?.fullName?.substring(0, 2)?.toUpperCase() || 'U'}
              </div>
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                {/* Profile Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-4">
                  <p className="text-white font-semibold text-base">{user?.fullName || 'User'}</p>
                  <p className="text-blue-200 text-xs mt-0.5">{ROLE_LABELS[user?.role] || user?.role}</p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowPrinterModal(true);
                    }}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HiPrinter className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-700">Printer Setting</span>
                    </div>
                    <HiChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Sign Out */}
                <div className="border-t border-gray-100 px-5 py-3">
                  <button
                    onClick={handleLogout}
                    className="px-4 py-1.5 border border-cyan-500 text-cyan-600 text-sm font-medium rounded-lg hover:bg-cyan-50 transition-colors"
                  >
                    SIGN OUT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Printer Setting Modal */}
      <PrinterSettingModal
        isOpen={showPrinterModal}
        onClose={() => setShowPrinterModal(false)}
      />
    </div>
  );
}
