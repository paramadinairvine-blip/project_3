import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  HiHome,
  HiCube,
  HiTruck,
  HiShoppingCart,
  HiArchive,
  HiOfficeBuilding,
  HiChartBar,
  HiUsers,
  HiClipboardList,
  HiCog,
  HiChevronDown,
  HiChevronRight,
  HiX,
} from 'react-icons/hi';
import useAuth from '../hooks/useAuth';
import { ROLES, ROLE_LABELS } from '../utils/constants';

const menuItems = [
  {
    label: 'Dashboard',
    path: '/',
    icon: HiHome,
  },
  {
    label: 'Produk',
    icon: HiCube,
    children: [
      { label: 'Daftar Produk', path: '/produk' },
      { label: 'Kategori', path: '/kategori' },
    ],
  },
  {
    label: 'Supplier',
    icon: HiTruck,
    children: [
      { label: 'Daftar Supplier', path: '/supplier' },
      { label: 'Purchase Order', path: '/purchase-order' },
    ],
  },
  {
    label: 'Transaksi',
    path: '/transaksi',
    icon: HiShoppingCart,
  },
  {
    label: 'Stok',
    icon: HiArchive,
    children: [
      { label: 'Overview Stok', path: '/stok' },
      { label: 'Opname Stok', path: '/stok/opname' },
    ],
  },
  {
    label: 'Proyek',
    icon: HiOfficeBuilding,
    children: [
      { label: 'Daftar Proyek', path: '/proyek' },
    ],
  },
  {
    label: 'Laporan',
    icon: HiChartBar,
    children: [
      { label: 'Stok', path: '/laporan/stok' },
      { label: 'Keuangan', path: '/laporan/keuangan', roles: [ROLES.ADMIN, ROLES.VIEWER] },
      { label: 'Tren', path: '/laporan/tren', roles: [ROLES.ADMIN, ROLES.VIEWER] },
    ],
  },
  {
    label: 'Pengguna',
    path: '/pengguna',
    icon: HiUsers,
    roles: [ROLES.ADMIN],
  },
  {
    label: 'Audit Log',
    path: '/audit-log',
    icon: HiClipboardList,
    roles: [ROLES.ADMIN],
  },
  {
    label: 'Setting',
    icon: HiCog,
    roles: [ROLES.ADMIN, ROLES.OPERATOR],
    children: [
      { label: 'Satuan', path: '/setting/satuan' },
    ],
  },
];

function MenuItem({ item, collapsed, closeMobile }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { checkPermission } = useAuth();

  if (item.roles && !checkPermission(item.roles)) return null;

  const hasChildren = item.children && item.children.length > 0;

  // Check if any child is active
  const isChildActive = hasChildren && item.children.some((c) => location.pathname === c.path);
  const isActive = item.path === '/'
    ? location.pathname === '/'
    : item.path && location.pathname.startsWith(item.path);

  const Icon = item.icon;

  if (hasChildren) {
    // Filter children by role
    const visibleChildren = item.children.filter(
      (child) => !child.roles || checkPermission(child.roles)
    );
    if (visibleChildren.length === 0) return null;

    const isOpen = open || isChildActive;

    return (
      <div>
        <button
          onClick={() => setOpen(!isOpen)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isChildActive
              ? 'bg-blue-600/20 text-blue-400'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {isOpen ? (
                <HiChevronDown className="w-4 h-4" />
              ) : (
                <HiChevronRight className="w-4 h-4" />
              )}
            </>
          )}
        </button>
        {!collapsed && isOpen && (
          <div className="ml-8 mt-1 space-y-1">
            {visibleChildren.map((child) => (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={closeMobile}
                className={({ isActive: active }) =>
                  `block px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`
                }
              >
                {child.label}
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
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
  const { user } = useAuth();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-700">
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-white font-bold text-lg leading-tight truncate">
              Toko Material
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">Pesantren</p>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <span className="text-white font-bold text-xl">TM</span>
          </div>
        )}
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden text-gray-400 hover:text-white p-1"
        >
          <HiX className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <MenuItem
            key={item.label}
            item={item}
            collapsed={collapsed}
            closeMobile={onMobileClose}
          />
        ))}
      </nav>

      {/* User info */}
      {user && (
        <div className="px-4 py-4 border-t border-gray-700">
          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.fullName}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {user.fullName?.charAt(0)?.toUpperCase()}
              </div>
            </div>
          )}
        </div>
      )}
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
