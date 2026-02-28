import { NavLink, Outlet } from 'react-router-dom';
import { HiCash, HiClipboardList, HiCube, HiChartBar, HiLogout } from 'react-icons/hi';
import useAuth from '../hooks/useAuth';
import { ROLE_LABELS } from '../utils/constants';

const navItems = [
  { to: '/kasir', label: 'Kasir', icon: HiCash },
  { to: '/riwayat', label: 'Riwayat', icon: HiClipboardList },
  { to: '/cek-stok', label: 'Cek Stok', icon: HiCube },
  { to: '/dashboard', label: 'Dashboard', icon: HiChartBar },
];

export default function POSLayout() {
  const { user, logout } = useAuth();
  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore logout API errors
    }
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-gray-900 text-white shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: Logo + POS badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <HiCash className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-sm">TOKO MATERIAL</span>
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">
                  POS
                </span>
              </div>
            </div>
          </div>

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

          {/* Right: User info + Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="text-right">
                <p className="text-xs font-medium leading-tight">{user?.fullName || 'User'}</p>
                <p className="text-[10px] text-gray-400">{ROLE_LABELS[user?.role] || user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Logout"
            >
              <HiLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
