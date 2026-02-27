import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiEye, HiFilter } from 'react-icons/hi';
import { stockAPI, categoryAPI } from '../../api/endpoints';
import { Table, Badge, Pagination, Modal, Loading } from '../../components/common';
import { formatTanggalWaktu } from '../../utils/formatDate';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS } from '../../utils/constants';

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

// ─── Main Component ───────────────────────────────────
export default function StockOverview() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ search: '', categoryId: '', date: '' });
  const [historyProduct, setHistoryProduct] = useState(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await categoryAPI.getAll();
      return data.data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['stock', { page, ...appliedFilters }],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (appliedFilters.search) params.search = appliedFilters.search;
      if (appliedFilters.categoryId) params.categoryId = appliedFilters.categoryId;
      if (appliedFilters.date) params.date = appliedFilters.date;
      const { data: res } = await stockAPI.getAll(params);
      return res;
    },
  });

  const stockItems = data?.data || [];
  const pagination = data?.pagination || {};

  const applyFilters = () => {
    setAppliedFilters({ search, categoryId, date });
    setPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') applyFilters();
  };

  // Flatten categories for dropdown
  const categoryOptions = [];
  (categories || []).forEach((cat) => {
    categoryOptions.push({ id: cat.id, name: cat.name });
    if (cat.children) {
      cat.children.forEach((sub) => {
        categoryOptions.push({ id: sub.id, name: `└ ${sub.name}` });
        if (sub.children) {
          sub.children.forEach((subsub) => {
            categoryOptions.push({ id: subsub.id, name: `  └ ${subsub.name}` });
          });
        }
      });
    }
  });

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
        <p className="font-medium text-gray-900">{row.name}</p>
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitoring Stok</h1>
        <p className="text-sm text-gray-500 mt-1">Pantau stok barang secara real-time</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={handleKeyDown}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          placeholder="Tanggal"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none bg-white"
        >
          <option value="">Semua Kategori</option>
          {categoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari produk"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
        />
        <button
          type="button"
          onClick={applyFilters}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm font-medium rounded-lg hover:bg-cyan-600 transition-colors whitespace-nowrap"
        >
          <HiFilter className="w-4 h-4" />
          Terapkan Filter
        </button>
      </div>

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
    </div>
  );
}
