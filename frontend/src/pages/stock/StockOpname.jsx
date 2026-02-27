import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiPlus, HiEye, HiCheck, HiQrcode, HiFilter } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { stockAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Table, Badge, Button, Modal, Loading, Card, Input, DateRangePicker } from '../../components/common';
import BarcodeScanner from '../../components/BarcodeScanner';
import { formatTanggalWaktu } from '../../utils/formatDate';
import { OPNAME_STATUS_LABELS, OPNAME_STATUS_COLORS } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

// ─── Active Opname Detail ────────────────────────────
function ActiveOpnameDetail({ opnameId, onBack }) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [showScanner, setShowScanner] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [filterText, setFilterText] = useState('');

  const { data: opname, isLoading } = useQuery({
    queryKey: ['opname', opnameId],
    queryFn: async () => {
      const { data } = await stockAPI.getOpnameById(opnameId);
      return data.data;
    },
    enabled: !!opnameId,
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }) => stockAPI.updateOpnameItem(opnameId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opname', opnameId] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyimpan')),
  });

  const completeMutation = useMutation({
    mutationFn: () => stockAPI.completeOpname(opnameId),
    onSuccess: () => {
      toast.success('Opname selesai! Stok telah disesuaikan.');
      queryClient.invalidateQueries({ queryKey: ['opname', opnameId] });
      queryClient.invalidateQueries({ queryKey: ['opname-list'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      setShowComplete(false);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyelesaikan opname')),
  });

  const handleActualStockChange = (item, value) => {
    const actualStock = parseInt(value, 10);
    if (isNaN(actualStock) || actualStock < 0) return;
    updateItemMutation.mutate({
      itemId: item.id,
      data: { actualStock, notes: item.notes || null },
    });
  };

  const handleNotesChange = (item, value) => {
    updateItemMutation.mutate({
      itemId: item.id,
      data: { actualStock: item.actualStock, notes: value || null },
    });
  };

  const handleBarcodeScan = (barcodeValue) => {
    setShowScanner(false);
    const items = opname?.items || [];
    const found = items.find(
      (item) => item.product?.barcode === barcodeValue || item.product?.sku === barcodeValue
    );
    if (found) {
      setHighlightId(found.id);
      setFilterText(found.product?.name || barcodeValue);
      setTimeout(() => setHighlightId(null), 3000);
      toast.success(`Ditemukan: ${found.product?.name}`);
    } else {
      toast.error(`Produk dengan barcode "${barcodeValue}" tidak ditemukan di daftar opname`);
    }
  };

  if (isLoading) return <Loading text="Memuat data opname..." />;
  if (!opname) return <p className="text-center text-gray-500 py-8">Opname tidak ditemukan</p>;

  const items = opname.items || [];
  const isActive = opname.status === 'IN_PROGRESS' || opname.status === 'DRAFT';

  const filteredItems = filterText
    ? items.filter((item) =>
        (item.product?.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
        (item.product?.sku || '').toLowerCase().includes(filterText.toLowerCase()) ||
        (item.product?.barcode || '').toLowerCase().includes(filterText.toLowerCase())
      )
    : items;

  const totalChecked = items.filter((i) => i.actualStock !== null && i.actualStock !== undefined).length;
  const totalPositiveDiff = items.reduce((sum, i) => {
    if (i.actualStock === null || i.actualStock === undefined) return sum;
    const diff = i.actualStock - i.systemStock;
    return diff > 0 ? sum + diff : sum;
  }, 0);
  const totalNegativeDiff = items.reduce((sum, i) => {
    if (i.actualStock === null || i.actualStock === undefined) return sum;
    const diff = i.actualStock - i.systemStock;
    return diff < 0 ? sum + diff : sum;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              &larr; Kembali
            </button>
            <Badge colorClass={OPNAME_STATUS_COLORS[opname.status]} size="sm">
              {OPNAME_STATUS_LABELS[opname.status]}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {opname.opnameNumber || 'Opname'} — Mulai {formatTanggalWaktu(opname.createdAt)}
          </p>
        </div>
        {isActive && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={HiQrcode} onClick={() => setShowScanner(true)}>
              Scan Barcode
            </Button>
            {isAdmin && (
              <Button size="sm" icon={HiCheck} onClick={() => setShowComplete(true)}>
                Selesaikan Opname
              </Button>
            )}
          </div>
        )}
      </div>

      <Input
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        placeholder="Cari produk dalam daftar opname..."
      />

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[200px]">Produk</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 w-24">Stok Sistem</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 w-28">Stok Aktual</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 w-24">Selisih</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[150px]">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((item, idx) => {
                const diff = (item.actualStock !== null && item.actualStock !== undefined)
                  ? item.actualStock - item.systemStock
                  : null;
                const isHighlighted = highlightId === item.id;

                return (
                  <tr key={item.id} className={`transition-colors ${isHighlighted ? 'bg-yellow-50' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{item.product?.name || '-'}</p>
                    </td>
                    <td className="text-center px-4 py-3 font-medium text-gray-700">{item.systemStock}</td>
                    <td className="text-center px-4 py-3">
                      {isActive ? (
                        <input
                          type="number"
                          min="0"
                          value={item.actualStock ?? ''}
                          onChange={(e) => handleActualStockChange(item, e.target.value)}
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="—"
                        />
                      ) : (
                        <span className="font-medium">{item.actualStock ?? '-'}</span>
                      )}
                    </td>
                    <td className="text-center px-4 py-3">
                      {diff !== null ? (
                        <span className={`font-semibold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isActive ? (
                        <input
                          type="text"
                          value={item.notes || ''}
                          onBlur={(e) => handleNotesChange(item, e.target.value)}
                          onChange={(e) => {
                            const items = [...(opname?.items || [])];
                            const i = items.findIndex((x) => x.id === item.id);
                            if (i >= 0) items[i] = { ...items[i], notes: e.target.value };
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Catatan..."
                        />
                      ) : (
                        <span className="text-xs text-gray-500">{item.notes || '-'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    {filterText ? 'Produk tidak ditemukan' : 'Tidak ada item'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm">
          <p className="text-xs text-gray-500">Item Dicek</p>
          <p className="text-xl font-bold text-gray-900">{totalChecked} / {items.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-gray-500">Total Selisih Positif</p>
          <p className="text-xl font-bold text-green-600">+{totalPositiveDiff}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-gray-500">Total Selisih Negatif</p>
          <p className="text-xl font-bold text-red-600">{totalNegativeDiff}</p>
        </Card>
      </div>

      <Modal
        isOpen={showComplete}
        onClose={() => setShowComplete(false)}
        title="Selesaikan Stock Opname"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowComplete(false)}>Batal</Button>
            <Button loading={completeMutation.isPending} onClick={() => completeMutation.mutate()}>
              Selesaikan & Sesuaikan Stok
            </Button>
          </>
        }
      >
        <div className="text-sm text-gray-600 space-y-3">
          <p>Apakah Anda yakin ingin menyelesaikan stock opname ini?</p>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1">
            <p>Item dicek: <span className="font-semibold">{totalChecked}/{items.length}</span></p>
            <p>Selisih positif: <span className="font-semibold text-green-600">+{totalPositiveDiff}</span></p>
            <p>Selisih negatif: <span className="font-semibold text-red-600">{totalNegativeDiff}</span></p>
          </div>
          <p className="text-yellow-700 bg-yellow-50 rounded-lg p-3">
            Stok produk akan otomatis disesuaikan berdasarkan hasil penghitungan. Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
      </Modal>

      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
export default function StockOpname() {
  const queryClient = useQueryClient();
  const { isAdmin, isOperator } = useAuth();
  const canCreate = isAdmin || isOperator;

  const [selectedOpnameId, setSelectedOpnameId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchNumber, setSearchNumber] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: '', dateTo: '', searchNumber: '' });
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['opname-list', { page, rowsPerPage, ...appliedFilters }],
    queryFn: async () => {
      const params = { page, limit: rowsPerPage };
      if (appliedFilters.searchNumber) params.search = appliedFilters.searchNumber;
      if (appliedFilters.dateFrom) params.dateFrom = appliedFilters.dateFrom;
      if (appliedFilters.dateTo) params.dateTo = appliedFilters.dateTo;
      const { data } = await stockAPI.getOpnameList(params);
      return data;
    },
  });

  const opnameList = data?.data || [];
  const pagination = data?.pagination || {};

  const createMutation = useMutation({
    mutationFn: () => stockAPI.createOpname(),
    onSuccess: (res) => {
      toast.success('Sesi opname baru berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['opname-list'] });
      setShowCreate(false);
      const newOpname = res.data.data;
      if (newOpname) setSelectedOpnameId(newOpname.id);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal membuat opname')),
  });

  const applyFilters = () => {
    setAppliedFilters({ dateFrom, dateTo, searchNumber });
    setPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') applyFilters();
  };

  const totalPages = pagination.totalPages || Math.ceil((pagination.total || opnameList.length) / rowsPerPage) || 1;

  // If viewing a detail
  if (selectedOpnameId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Opname</h1>
          <p className="text-sm text-gray-500 mt-1">Penghitungan fisik dan penyesuaian stok</p>
        </div>
        <ActiveOpnameDetail
          opnameId={selectedOpnameId}
          onBack={() => setSelectedOpnameId(null)}
        />
      </div>
    );
  }

  const columns = [
    {
      key: 'opnameNumber',
      header: 'Nomor',
      render: (v) => <span className="font-medium font-mono text-gray-900">{v || '-'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Tanggal Mulai',
      render: (v) => formatTanggalWaktu(v),
    },
    {
      key: 'completedAt',
      header: 'Tanggal Selesai',
      render: (v) => v ? formatTanggalWaktu(v) : '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <Badge colorClass={OPNAME_STATUS_COLORS[v]} size="sm">
          {OPNAME_STATUS_LABELS[v] || v}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      width: '80px',
      render: (_, row) => (
        <button
          onClick={() => setSelectedOpnameId(row.id)}
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Lihat Detail"
          aria-label="Lihat detail"
        >
          <HiEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Opname</h1>
          <p className="text-sm text-gray-500 mt-1">Penghitungan fisik dan penyesuaian stok</p>
        </div>
        {canCreate && (
          <Button icon={HiPlus} onClick={() => setShowCreate(true)}>
            Mulai Opname Baru
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          />
          <input
            type="text"
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="No. Stock Opname"
            className="w-44 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
          />
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm font-medium rounded-lg hover:bg-cyan-600 transition-colors whitespace-nowrap"
          >
            <HiFilter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Rows per page + Pagination */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Baris</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="w-8 h-8 flex items-center justify-center bg-cyan-500 text-white text-sm font-medium rounded-full">
              {page}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={opnameList}
        loading={isLoading}
        emptyMessage="Belum ada sesi opname"
      />

      {/* Create Confirmation */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Mulai Opname Baru"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Mulai Opname
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Sesi stock opname baru akan dibuat. Semua produk aktif akan dimuat ke dalam daftar
          penghitungan. Pastikan Anda siap untuk memulai penghitungan fisik.
        </p>
      </Modal>
    </div>
  );
}
