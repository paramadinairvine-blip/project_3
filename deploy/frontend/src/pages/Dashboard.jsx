import { useQuery } from '@tanstack/react-query';
import {
  HiCube,
  HiCurrencyDollar,
  HiShoppingCart,
  HiExclamation,
} from 'react-icons/hi';
import { reportAPI, purchaseOrderAPI, projectAPI } from '../api/endpoints';
import { Card, Badge, Breadcrumb } from '../components/common';
import TransactionChart from '../components/charts/TransactionChart';
import StockChart from '../components/charts/StockChart';
import { formatRupiah } from '../utils/formatCurrency';
import { formatTanggal } from '../utils/formatDate';
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from '../utils/constants';

// ─── Skeleton ─────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <Skeleton className="h-5 w-48 mb-4" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <Skeleton className="h-5 w-40 mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 mb-3">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────
function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
    red: { bg: 'bg-red-50', icon: 'text-red-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${c.bg}`}>
          <Icon className={`w-6 h-6 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await reportAPI.getDashboard();
      return data.data;
    },
    refetchInterval: 60000, // Refresh every 60s
  });

  const { data: activePOsData } = useQuery({
    queryKey: ['activePOs'],
    queryFn: async () => {
      const { data } = await purchaseOrderAPI.getAll({ status: 'SENT', limit: 5 });
      return data.data;
    },
  });

  const { data: activeProjectsData } = useQuery({
    queryKey: ['activeProjects'],
    queryFn: async () => {
      const { data } = await projectAPI.getAll({ status: 'IN_PROGRESS', limit: 5 });
      return data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Dashboard' }]} className="mb-4" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan sistem inventori</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton />
          <TableSkeleton />
        </div>
      </div>
    );
  }

  const d = dashboard || {};

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Dashboard' }]} className="mb-4" />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Ringkasan sistem inventori</p>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Produk Aktif"
          value={d.totalProducts?.toLocaleString('id-ID') || '0'}
          icon={HiCube}
          color="blue"
        />
        <StatCard
          title="Nilai Total Stok"
          value={formatRupiah(d.totalStockValue)}
          icon={HiCurrencyDollar}
          color="green"
        />
        <StatCard
          title="Transaksi Bulan Ini"
          value={d.monthlyTransaction?.count?.toLocaleString('id-ID') || '0'}
          subtitle={formatRupiah(d.monthlyTransaction?.total)}
          icon={HiShoppingCart}
          color="purple"
        />
        <StatCard
          title="Produk Stok Minimum"
          value={d.lowStockCount || 0}
          subtitle={d.lowStockCount > 0 ? 'Perlu restock segera' : 'Semua aman'}
          icon={HiExclamation}
          color="red"
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Tren Transaksi 6 Bulan Terakhir" padding="sm">
          <div className="pt-2">
            <TransactionChart data={d.charts?.transactionTrend || []} />
          </div>
        </Card>

        <Card title="Top 5 Produk Paling Banyak Dikeluarkan" padding="sm">
          <div className="pt-2">
            <StockChart data={d.charts?.topProducts || []} />
          </div>
        </Card>
      </div>

      {/* Row 3: Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock table */}
        <Card title="Produk Stok Minimum" padding="none">
          {d.lowStockItems?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Produk</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Stok</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Minimum</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.lowStockItems.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.sku}</p>
                      </td>
                      <td className="text-center px-4 py-3 font-semibold text-red-600">
                        {item.stock} {item.unit}
                      </td>
                      <td className="text-center px-4 py-3 text-gray-600">
                        {item.minStock} {item.unit}
                      </td>
                      <td className="text-center px-4 py-3">
                        <Badge variant="danger" size="sm">Rendah</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              Semua produk stoknya aman
            </div>
          )}
        </Card>

        {/* Active POs */}
        <Card title="Purchase Order Berjalan" padding="none">
          {activePOsData?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">No. PO</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activePOsData.slice(0, 5).map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{po.poNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{po.supplier?.name || '-'}</td>
                      <td className="text-center px-4 py-3">
                        <Badge colorClass={PO_STATUS_COLORS[po.status]} size="sm">
                          {PO_STATUS_LABELS[po.status] || po.status}
                        </Badge>
                      </td>
                      <td className="text-right px-6 py-3 text-gray-500">{formatTanggal(po.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              Tidak ada PO yang sedang berjalan
            </div>
          )}
        </Card>
      </div>

      {/* Row 4: Active projects */}
      {activeProjectsData?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Proyek Aktif</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjectsData.map((project) => {
              const progress = project.progressPercent || 0;
              const budgetUsed = Number(project.budget) > 0
                ? Math.round((Number(project.spent) / Number(project.budget)) * 100)
                : 0;

              return (
                <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Budget: {formatRupiah(project.budget)}
                      </p>
                    </div>
                    <Badge variant="info" size="sm">Berjalan</Badge>
                  </div>

                  {/* Material progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Material</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Budget usage */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Budget</span>
                      <span className="font-medium">{budgetUsed}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Sisa: {formatRupiah(project.budgetRemaining || (Number(project.budget) - Number(project.spent)))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
