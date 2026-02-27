import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  HiHome,
  HiCube,
  HiArchive,
  HiChartBar,
  HiCurrencyDollar,
  HiCog,
  HiChevronDown,
  HiX,
  HiLogout,
  HiUser,
  HiSupport,
} from 'react-icons/hi';
import useAuth from '../hooks/useAuth';
import { ROLES, ROLE_LABELS } from '../utils/constants';

const menuItems = [
  {
    label: 'DASHBOARD',
    path: '/',
    icon: HiHome,
  },
  {
    label: 'PRODUK',
    icon: HiCube,
    children: [
      { label: 'Kategori', code: 'KT', path: '/kategori' },
      { label: 'Master Produk', code: 'MP', path: '/produk' },
    ],
  },
  {
    label: 'INVENTORI',
    icon: HiArchive,
    children: [
      { label: 'Monitoring Stock', code: 'MS', path: '/stok' },
      { label: 'Purchase Order', code: 'PO', path: '/purchase-order' },
      { label: 'Stock Opname', code: 'SO', path: '/stok/opname', roles: [ROLES.ADMIN, ROLES.OPERATOR] },
      { label: 'Supplier', code: 'SP', path: '/supplier' },
    ],
  },
  {
    label: 'LAPORAN',
    icon: HiChartBar,
    children: [
      { label: 'Laporan Stok', code: 'LS', path: '/laporan/stok' },
      { label: 'Laporan Keuangan', code: 'LK', path: '/laporan/keuangan', roles: [ROLES.ADMIN, ROLES.VIEWER] },
      { label: 'Laporan Tren', code: 'LT', path: '/laporan/tren', roles: [ROLES.ADMIN, ROLES.VIEWER] },
    ],
  },
  {
    label: 'KEUANGAN',
    icon: HiCurrencyDollar,
    children: [
      { label: 'Transaksi', code: 'TR', path: '/transaksi' },
      { label: 'Proyek', code: 'PY', path: '/proyek' },
    ],
  },
  {
    label: 'SETTING',
    icon: HiCog,
    roles: [ROLES.ADMIN, ROLES.OPERATOR],
    children: [
      { label: 'Satuan', code: 'ST', path: '/setting/satuan', roles: [ROLES.ADMIN, ROLES.OPERATOR] },
      { label: 'Pengguna', code: 'PG', path: '/pengguna', roles: [ROLES.ADMIN] },
      { label: 'Audit Log', code: 'AL', path: '/audit-log', roles: [ROLES.ADMIN] },
    ],
  },
];

function MenuItem({ item, collapsed, closeMobile }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { checkPermission } = useAuth();

  if (item.roles && !checkPermission(item.roles)) return null;

  const hasChildren = item.children && item.children.length > 0;

  const isChildActive = hasChildren && item.children.some((c) =>
    c.path === '/' ? location.pathname === '/' : location.pathname.startsWith(c.path)
  );
  const isActive = item.path === '/'
    ? location.pathname === '/'
    : item.path && location.pathname.startsWith(item.path);

  const Icon = item.icon;

  if (hasChildren) {
    const visibleChildren = item.children.filter(
      (child) => !child.roles || checkPermission(child.roles)
    );
    if (visibleChildren.length === 0) return null;

    const isOpen = open || isChildActive;

    return (
      <div>
        <button
          onClick={() => setOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-3 text-[13px] font-semibold tracking-wide transition-colors ${
            isChildActive
              ? 'bg-blue-600/20 text-blue-400'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </div>
          {!collapsed && (
            <HiChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          )}
        </button>
        {!collapsed && isOpen && (
          <div className="bg-gray-950/50">
            {visibleChildren.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={closeMobile}
                className={({ isActive: active }) =>
                  `flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`
                }
              >
                {/* 2-letter abbreviation code badge */}
                <span className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  location.pathname === child.path || (child.path !== '/' && location.pathname.startsWith(child.path))
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  {child.code}
                </span>
                <span>{child.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={closeMobile}
      className={({ isActive: active }) =>
        `flex items-center gap-3 px-4 py-3 text-[13px] font-semibold tracking-wide transition-colors ${
          active
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }`
      }
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    onMobileClose?.();
    await logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header — Logo + Version */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
        {!collapsed ? (
          <div className="min-w-0">
            <h1 className="text-white font-bold text-base leading-tight tracking-wide">
              TOKO MATERIAL
            </h1>
            <p className="text-gray-400 text-xs mt-0.5 tracking-wider">PESANTREN</p>
            <p className="text-gray-500 text-[10px] mt-1">V.1.0.0</p>
          </div>
        ) : (
          <div className="mx-auto">
            <span className="text-white font-bold text-xl">TM</span>
          </div>
        )}
        <button
          onClick={onMobileClose}
          className="lg:hidden text-gray-400 hover:text-white p-1"
        >
          <HiX className="w-5 h-5" />
        </button>
      </div>

      {/* User Profile — Click to toggle dropdown */}
      {user && (
        <div className="border-b border-gray-700 relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full px-4 py-4 hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {!collapsed ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-white text-sm font-semibold truncate">{user.fullName}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {ROLE_LABELS[user.role] || user.role}
                  </p>
                </div>
                <HiChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${profileOpen ? 'rotate-180' : ''}`}
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.fullName?.charAt(0)?.toUpperCase()}
                </div>
              </div>
            )}
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && !collapsed && (
            <div className="bg-gray-950/60">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 pl-8 pr-4 py-2.5 text-sm text-gray-400 hover:bg-red-600/20 hover:text-red-400 transition-colors"
              >
                <span className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold bg-gray-700 text-gray-300">
                  <HiLogout className="w-3.5 h-3.5" />
                </span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {menuItems.map((item) => (
          <MenuItem
            key={item.label}
            item={item}
            collapsed={collapsed}
            closeMobile={onMobileClose}
          />
        ))}
      </nav>

      {/* Technical Support */}
      <div className="border-t border-gray-700 p-2">
        <a
          href="https://wa.me/6285156526862"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-green-400 transition-colors ${collapsed ? 'justify-center' : ''}`}
          title="Technical Support"
        >
          <HiSupport className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Technical Support</span>}
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-gray-900 border-r border-gray-700 z-30 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen w-64 bg-gray-900 z-50 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
