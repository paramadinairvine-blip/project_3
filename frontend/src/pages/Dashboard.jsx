import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  HiCube,
  HiCurrencyDollar,
  HiShoppingCart,
  HiExclamation,
  HiCalendar,
} from 'react-icons/hi';
import {
  PieChart, Pie, Cell, Tooltip as PieTooltip, ResponsiveContainer as PieContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { reportAPI } from '../api/endpoints';
import { Card } from '../components/common';
import { formatRupiah } from '../utils/formatCurrency';

// ─── Helpers ──────────────────────────────────────────
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1'];

function getYears() {
  const current = new Date().getFullYear();
  return [current, current - 1, current - 2];
}

// ─── Skeleton ─────────────────────────────────────────
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

// ─── Stat Card ────────────────────────────────────────
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

// ─── Custom Tooltips ──────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
      <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm" style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{formatRupiah(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const PieChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
      <p className="text-sm font-medium text-gray-900">{d.name}</p>
      <p className="text-sm text-gray-600">{formatRupiah(d.value)}</p>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────
export default function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [year, setYear] = useState(now.getFullYear());

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await reportAPI.getDashboard();
      return data.data;
    },
    refetchInterval: 60000,
  });

  // Trend report for selected period (3 months comparison)
  const { data: trendData } = useQuery({
    queryKey: ['trend-dashboard', year, month],
    queryFn: async () => {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      const { data } = await reportAPI.getTrend({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      return data.data;
    },
  });

  // Financial report for selected month
  const { data: financialData } = useQuery({
    queryKey: ['financial-dashboard', year, month],
    queryFn: async () => {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      const { data } = await reportAPI.getFinancial({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      return data.data;
    },
  });

  const d = dashboard || {};

  // ─── Prepare Pie Chart Data (Pendapatan per Tipe) ───
  const pieData = (financialData?.expenditureByType || [])
    .filter((e) => e.total > 0)
    .map((e) => ({ name: e.label, value: e.total }));

  // ─── Prepare Line Chart Data (Grafik Penjualan 3 bulan) ───
  const transactionTrend = d.charts?.transactionTrend || [];
  const salesChartData = transactionTrend.map((t) => ({
    label: t.label,
    total: t.total,
    count: t.count,
  }));

  // ─── Top Products Bar Chart ─────────────────────────
  const topProducts = (d.charts?.topProducts || []).map((tp) => ({
    name: tp.product?.name?.substring(0, 15) || '-',
    qty: tp.totalQuantity || 0,
    value: tp.totalValue || 0,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-6"><Skeleton className="h-72 w-full" /></div>
          <div className="bg-white border rounded-xl p-6"><Skeleton className="h-72 w-full" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan sistem inventori</p>
        </div>
        <div className="flex items-center gap-2">
          <HiCalendar className="w-5 h-5 text-gray-400" />
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="rounded-lg border-gray-300 text-sm py-2 px-3 focus:border-blue-500 focus:ring-blue-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-lg border-gray-300 text-sm py-2 px-3 focus:border-blue-500 focus:ring-blue-500"
          >
            {getYears().map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
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

      {/* Row 2: Pie Chart (Pendapatan) + Line Chart (Grafik Penjualan) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pendapatan per Tipe Transaksi */}
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Pendapatan {MONTHS[month]} {year}
            </h3>
            <p className="text-sm text-gray-500">Per Tipe Transaksi</p>
          </div>
          {pieData.length > 0 ? (
            <PieContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={0}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}
                  labelLine={true}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <PieTooltip content={<PieChartTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={10}
                  formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                />
              </PieChart>
            </PieContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              Belum ada data pendapatan di bulan ini
            </div>
          )}
        </Card>

        {/* Grafik Penjualan (Tren 6 Bulan) */}
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">Grafik Penjualan</h3>
            <p className="text-sm text-gray-500">Per 6 bulan terakhir</p>
          </div>
          {salesChartData.some((d) => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Penjualan"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              Belum ada data penjualan
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Pendapatan Harian + Top Produk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pendapatan summary */}
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Ringkasan Pendapatan
            </h3>
            <p className="text-sm text-gray-500">{MONTHS[month]} {year}</p>
          </div>
          <div className="space-y-4">
            {(financialData?.expenditureByType || []).map((item, idx) => {
              const totalAll = financialData?.totalExpenditure || 1;
              const pct = totalAll > 0 ? ((item.total / totalAll) * 100).toFixed(1) : 0;
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-gray-700 font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs">{pct}%</span>
                      <span className="font-semibold text-gray-900">{formatRupiah(item.total)}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 mt-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Total Pendapatan</span>
              <span className="text-lg font-bold text-gray-900">
                {formatRupiah(financialData?.totalExpenditure || 0)}
              </span>
            </div>
            {trendData?.periodComparison && (
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-medium ${trendData.periodComparison.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {trendData.periodComparison.direction === 'up' ? '▲' : '▼'}{' '}
                  {Math.abs(trendData.periodComparison.changePercent)}%
                </span>
                <span className="text-gray-500">dibanding periode sebelumnya</span>
              </div>
            )}
          </div>
        </Card>

        {/* Top Produk */}
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">Top 5 Produk</h3>
            <p className="text-sm text-gray-500">Paling banyak dikeluarkan bulan ini</p>
          </div>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  width={120}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{d.name}</p>
                        <p className="text-sm text-blue-600">Qty: {d.qty}</p>
                        <p className="text-sm text-green-600">Nilai: {formatRupiah(d.value)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="qty" fill="#3b82f6" radius={[0, 6, 6, 0]} maxBarSize={30}>
                  {topProducts.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              Belum ada data produk bulan ini
            </div>
          )}
        </Card>
      </div>

      {/* Row 4: Produk Stok Rendah */}
      {d.lowStockItems?.length > 0 && (
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">Produk Stok Minimum</h3>
            <p className="text-sm text-gray-500">Perlu restock segera</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Produk</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Stok</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Minimum</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Kekurangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {d.lowStockItems.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.name}</p>
                    </td>
                    <td className="text-center px-4 py-3 font-semibold text-red-600">
                      {item.stock} {item.unit}
                    </td>
                    <td className="text-center px-4 py-3 text-gray-600">
                      {item.minStock} {item.unit}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                        -{item.minStock - item.stock} {item.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
