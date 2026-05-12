import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HiCube, HiCurrencyDollar, HiExclamation, HiXCircle,
  HiEye, HiAdjustments,
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { stockAPI, productAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Table, Badge, Button, SearchBar, Pagination, Modal, Card, Input, Loading, Breadcrumb, Skeleton } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggalWaktu } from '../../utils/formatDate';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

// ─── Stat Card ────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600' },
    red: { bg: 'bg-red-50', icon: 'text-red-600' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Movement History Modal ───────────────────────────
function MovementHistoryModal({ product, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock-history', product?.id],
    queryFn: async () => {
      const { data } = await stockAPI.getByProduct(product.id, { limit: 20 });
      return data.data;
    },
    enabled: !!product?.id,
  });

  const movements = data?.history?.data || [];

  const columns = [
    { key: 'createdAt', header: 'Tanggal', render: (v) => formatTanggalWaktu(v) },
    {
      key: 'type', header: 'Tipe',
      render: (v) => (
        <Badge colorClass={MOVEMENT_TYPE_COLORS[v]} size="sm">
          {MOVEMENT_TYPE_LABELS[v] || v}
        </Badge>
      ),
    },
    {
      key: 'quantity', header: 'Jumlah',
      render: (v, row) => (
        <span className={row.type === 'IN' ? 'text-green-600 font-medium' : row.type === 'OUT' ? 'text-red-600 font-medium' : 'font-medium'}>
          {row.type === 'IN' ? '+' : row.type === 'OUT' ? '-' : ''}{Math.abs(v)}
        </span>
      ),
    },
    { key: 'previousStock', header: 'Sebelum' },
    { key: 'newStock', header: 'Sesudah' },
    {
      key: 'referenceType', header: 'Referensi',
      render: (v) => <span className="text-xs text-gray-500">{v || '-'}</span>,
    },
    {
      key: 'notes', header: 'Catatan',
      render: (v) => <span className="text-xs text-gray-500">{v || '-'}</span>,
    },
  ];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Riwayat Stok — ${product?.name}`}
      size="lg"
    >
      {isLoading ? (
        <Loading text="Memuat riwayat..." />
      ) : (
        <Table columns={columns} data={movements} emptyMessage="Belum ada pergerakan stok" />
      )}
    </Modal>
  );
}

// ─── Stock Adjustment Modal ───────────────────────────
function AdjustmentModal({ onClose }) {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState('IN');
  const [notes, setNotes] = useState('');
  const [searchProduct, setSearchProduct] = useState('');

  const { data: products } = useQuery({
    queryKey: ['products-adjust'],
    queryFn: async () => {
      const { data } = await productAPI.getAll({ limit: 500 });
      return data.data || [];
    },
  });

  const adjustMutation = useMutation({
    mutationFn: (data) => stockAPI.adjust(data),
    onSuccess: () => {
      toast.success('Stok berhasil disesuaikan');
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyesuaikan stok')),
  });

  const handleSubmit = () => {
    if (!productId) { toast.error('Pilih produk'); return; }
    if (!quantity || parseFloat(quantity) <= 0) { toast.error('Jumlah harus lebih dari 0'); return; }
    adjustMutation.mutate({
      productId,
      quantity: parseFloat(quantity),
      type,
      notes: notes.trim() || null,
    });
  };

  const filteredProducts = (products || []).filter((p) =>
    !searchProduct || p.name.toLowerCase().includes(searchProduct.toLowerCase()) || p.sku.toLowerCase().includes(searchProduct.toLowerCase())
  );

  const selectedProduct = (products || []).find((p) => p.id === productId);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Penyesuaian Stok"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button loading={adjustMutation.isPending} onClick={handleSubmit}>
            Simpan Penyesuaian
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Product search & select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Produk *</label>
          <input
            type="text"
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            placeholder="Cari produk..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-50">
            {filteredProducts.slice(0, 20).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setProductId(p.id); setSearchProduct(p.name); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                  p.id === productId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-gray-500 ml-2">({p.sku}) — Stok: {p.stock}</span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-500">Tidak ditemukan</p>
            )}
          </div>
          {selectedProduct && (
            <p className="text-xs text-gray-500 mt-1">
              Stok saat ini: <span className="font-semibold">{selectedProduct.stock}</span> {selectedProduct.unit}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipe Penyesuaian *</label>
          <div className="flex gap-3">
            {[
              { value: 'IN', label: 'Tambah Stok', color: 'text-green-700 bg-green-50 border-green-300' },
              { value: 'OUT', label: 'Kurangi Stok', color: 'text-red-700 bg-red-50 border-red-300' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  type === opt.value ? opt.color : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <Input
          label="Jumlah *"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Masukkan jumlah"
        />

        {/* Notes */}
        <Input
          label="Catatan"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Alasan penyesuaian stok"
          textarea
          rows={2}
        />
      </div>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────
export default function StockOverview() {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [historyProduct, setHistoryProduct] = useState(null);
  const [showAdjust, setShowAdjust] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['stock', { page, search }],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const { data: res } = await stockAPI.getAll(params);
      return res;
    },
  });

  const stockItems = data?.data || [];
  const pagination = data?.pagination || {};
  const summary = data?.summary || {};

  const getStockBadge = (product) => {
    if (product.stock <= 0) return <Badge variant="danger" size="sm">Habis</Badge>;
    if (product.stock < product.minStock) return <Badge variant="warning" size="sm">Rendah</Badge>;
    return <Badge variant="success" size="sm">Aman</Badge>;
  };

  const columns = [
    {
      key: 'name',
      header: 'Produk',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500 font-mono">{row.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      render: (_, row) => <span className="text-gray-600">{row.category?.name || '-'}</span>,
    },
    {
      key: 'stock',
      header: 'Stok',
      sortable: true,
      render: (_, row) => (
        <span className={`font-semibold ${row.stock <= 0 ? 'text-red-600' : row.stock < row.minStock ? 'text-yellow-600' : 'text-gray-900'}`}>
          {row.stock} {row.unitOfMeasure?.abbreviation || row.unit}
        </span>
      ),
    },
    {
      key: 'minStock',
      header: 'Stok Min.',
      render: (v) => <span className="text-gray-600">{v}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => getStockBadge(row),
    },
    {
      key: 'actions',
      header: 'Aksi',
      width: '80px',
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setHistoryProduct(row); }}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Riwayat Pergerakan"
          aria-label="Riwayat pergerakan"
        >
          <HiEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Stok' }]} className="mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview Stok</h1>
          <p className="text-sm text-gray-500 mt-1">Pantau stok barang secara real-time</p>
        </div>
        {isAdmin && (
          <Button icon={HiAdjustments} onClick={() => setShowAdjust(true)} aria-label="Penyesuaian stok">
            Penyesuaian Stok
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <Skeleton.Card count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Produk"
            value={summary.totalProducts?.toLocaleString('id-ID') || stockItems.length || '0'}
            icon={HiCube}
            color="blue"
          />
          <StatCard
            title="Nilai Total Stok"
            value={formatRupiah(summary.totalStockValue)}
            icon={HiCurrencyDollar}
            color="green"
          />
          <StatCard
            title="Stok Rendah"
            value={summary.lowStockCount || 0}
            icon={HiExclamation}
            color="yellow"
          />
          <StatCard
            title="Stok Habis"
            value={summary.outOfStockCount || 0}
            icon={HiXCircle}
            color="red"
          />
        </div>
      )}

      {/* Search */}
      <SearchBar
        placeholder="Cari nama produk atau SKU..."
        onSearch={(v) => { setSearch(v); setPage(1); }}
        className="max-w-md"
      />

      {/* Table */}
      <Table
        columns={columns}
        data={stockItems}
        loading={isLoading}
        sortable
        emptyMessage="Tidak ada data stok"
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Movement History Modal */}
      {historyProduct && (
        <MovementHistoryModal
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showAdjust && (
        <AdjustmentModal onClose={() => setShowAdjust(false)} />
      )}
    </div>
  );
}
