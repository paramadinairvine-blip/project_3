import { useQuery } from '@tanstack/react-query';
import { HiCash, HiShoppingCart, HiCube, HiExclamation, HiRefresh, HiDatabase, HiClipboardList } from 'react-icons/hi';
import { reportAPI } from '../api/endpoints';
import { formatRupiah } from '../utils/formatCurrency';
import { formatTanggalPanjang } from '../utils/formatDate';
import { Loading } from '../components/common';

export default function Dashboard() {
  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportAPI.getDashboard(),
    select: (res) => res.data.data || {},
    refetchInterval: 60000,
  });

  const monthlyCount = dashboard?.monthlyTransaction?.count || 0;
  const monthlyTotal = dashboard?.monthlyTransaction?.total || 0;

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dashboard Kasir</h2>
            <p className="text-sm text-gray-500">{formatTanggalPanjang(new Date())}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <HiRefresh className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <Loading text="Memuat dashboard..." />
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HiShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Transaksi Bulan Ini</p>
                    <p className="text-lg font-bold text-gray-900">{monthlyCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HiCash className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pendapatan Bulan Ini</p>
                    <p className="text-lg font-bold text-gray-900">{formatRupiah(monthlyTotal)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HiCube className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Produk</p>
                    <p className="text-lg font-bold text-gray-900">{dashboard?.totalProducts || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HiExclamation className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Stok Rendah</p>
                    <p className="text-lg font-bold text-gray-900">{dashboard?.lowStockCount || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Extra info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HiDatabase className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Nilai Stok</p>
                    <p className="text-lg font-bold text-gray-900">{formatRupiah(dashboard?.totalStockValue || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HiClipboardList className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">PO Aktif</p>
                    <p className="text-lg font-bold text-gray-900">{dashboard?.activePOs || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Products this month */}
            {dashboard?.charts?.topProducts && dashboard.charts.topProducts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Produk Terlaris Bulan Ini</h3>
                <div className="space-y-2">
                  {dashboard.charts.topProducts.map((item) => (
                    <div key={item.product?.id || item.rank} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-5">#{item.rank}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.product?.name || '-'}</p>
                          <p className="text-xs text-gray-500">{item.totalQuantity} {item.product?.unit || 'pcs'} terjual</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{formatRupiah(item.totalValue)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock Alert */}
            {dashboard?.lowStockItems && dashboard.lowStockItems.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 p-4">
                <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <HiExclamation className="w-5 h-5" />
                  Produk Stok Rendah
                </h3>
                <div className="space-y-2">
                  {dashboard.lowStockItems.map((product) => (
                    <div key={product.id} className="flex justify-between items-center py-1.5">
                      <div>
                        <span className="text-sm text-gray-700">{product.name}</span>
                        <span className="text-xs text-gray-400 ml-2">(min: {product.minStock})</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600">
                        {product.stock} {product.unit || 'pcs'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-gray-400 py-4">
          Data diperbarui otomatis setiap 60 detik
        </p>
      </div>
    </div>
  );
}
