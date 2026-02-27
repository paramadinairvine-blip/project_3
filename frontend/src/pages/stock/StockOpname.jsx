import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiPlus, HiEye, HiCheck, HiQrcode, HiFilter, HiSearch, HiCamera } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { stockAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Table, Badge, Button, Modal, Loading, Card, Input, DateRangePicker } from '../../components/common';
import BarcodeScanner from '../../components/BarcodeScanner';
import { formatTanggalWaktu } from '../../utils/formatDate';
import { OPNAME_STATUS_LABELS, OPNAME_STATUS_COLORS } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

// ─── Active Opname Detail (Form Stock Opname) ────────
function ActiveOpnameDetail({ opnameId, onBack }) {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const [showScanner, setShowScanner] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cartItemIds, setCartItemIds] = useState(new Set());

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

  const handleBarcodeScan = (barcodeValue) => {
    setShowScanner(false);
    const items = opname?.items || [];
    const found = items.filter(
      (item) => (item.product?.barcode || '').toLowerCase() === barcodeValue.toLowerCase() ||
                (item.product?.sku || '').toLowerCase() === barcodeValue.toLowerCase()
    );
    if (found.length > 0) {
      setBarcodeSearch(barcodeValue);
      setSearchResults(found);
      toast.success(`Ditemukan ${found.length} produk`);
    } else {
      toast.error(`Produk dengan barcode "${barcodeValue}" tidak ditemukan`);
    }
  };

  const handleBarcodeSearchSubmit = () => {
    if (!barcodeSearch.trim()) { setSearchResults([]); return; }
    const items = opname?.items || [];
    const results = items.filter(
      (item) => (item.product?.barcode || '').toLowerCase().includes(barcodeSearch.toLowerCase()) ||
                (item.product?.sku || '').toLowerCase().includes(barcodeSearch.toLowerCase())
    );
    setSearchResults(results);
    if (results.length === 0) toast.error('Produk tidak ditemukan');
  };

  const handleNameSearchSubmit = () => {
    if (!nameSearch.trim()) { setSearchResults([]); return; }
    const items = opname?.items || [];
    const results = items.filter(
      (item) => (item.product?.name || '').toLowerCase().includes(nameSearch.toLowerCase())
    );
    setSearchResults(results);
    if (results.length === 0) toast.error('Produk tidak ditemukan');
  };

  const addToCart = (item) => {
    setCartItemIds((prev) => new Set([...prev, item.id]));
    toast.success(`${item.product?.name} ditambahkan ke keranjang`);
  };

  const removeFromCart = (itemId) => {
    setCartItemIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  if (isLoading) return <Loading text="Memuat data opname..." />;
  if (!opname) return <p className="text-center text-gray-500 py-8">Opname tidak ditemukan</p>;

  const items = opname.items || [];
  const isActive = opname.status === 'IN_PROGRESS' || opname.status === 'DRAFT';
  const cartItems = items.filter((item) => cartItemIds.has(item.id));
  const totalChecked = items.filter((i) => i.actualStock !== null && i.actualStock !== undefined).length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            &larr; Kembali
          </button>
          <span className="text-gray-300">|</span>
          <h2 className="text-lg font-semibold text-gray-800">Form Stock Opname</h2>
          <Badge colorClass={OPNAME_STATUS_COLORS[opname.status]} size="sm">
            {OPNAME_STATUS_LABELS[opname.status]}
          </Badge>
        </div>
        <p className="text-sm text-gray-500">{opname.opnameNumber}</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Search panel */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-semibold text-gray-800">Pilih Produk SO</h3>

          {/* Barcode search */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Cari barcode</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={barcodeSearch}
                onChange={(e) => setBarcodeSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSearchSubmit()}
                placeholder="Cari Barcode (F2)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={handleBarcodeSearchSubmit} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <HiSearch className="w-4 h-4 text-gray-500" />
              </button>
              <button type="button" onClick={() => setShowScanner(true)} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <HiCamera className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Name search */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Cari nama</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSearchSubmit()}
                placeholder="Cari nama produk (F3)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={handleNameSearchSubmit} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <HiSearch className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 border-b">
                Hasil Pencarian ({searchResults.length})
              </div>
              <div className="max-h-[250px] overflow-y-auto divide-y divide-gray-50">
                {searchResults.map((item) => {
                  const alreadyInCart = cartItemIds.has(item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.product?.name}</p>
                        <p className="text-xs text-gray-500">Stok: {item.systemStock}</p>
                      </div>
                      {alreadyInCart ? (
                        <span className="text-xs text-green-600 font-medium">Sudah ditambah</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Tambah ke keranjang"
                        >
                          <HiPlus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Cart table */}
        <div className="lg:col-span-3">
          <h3 className="text-base font-semibold text-gray-800 mb-2">
            Keranjang Data SO
            {cartItems.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({cartItems.length} item)</span>}
          </h3>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-blue-50 border-b border-blue-100">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-blue-700 min-w-[200px]">PRODUK</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-blue-700 w-24">STOK SISTEM</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-blue-700 w-28">STOK AKTUAL</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-blue-700 w-20">SELISIH</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cartItems.map((item) => {
                    const diff = (item.actualStock !== null && item.actualStock !== undefined)
                      ? item.actualStock - item.systemStock
                      : null;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900 text-sm">{item.product?.name || '-'}</p>
                        </td>
                        <td className="text-center px-4 py-2.5 font-medium text-gray-600">{item.systemStock}</td>
                        <td className="text-center px-4 py-2.5">
                          {isActive ? (
                            <input
                              type="number"
                              min="0"
                              value={item.actualStock ?? ''}
                              onChange={(e) => handleActualStockChange(item, e.target.value)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="—"
                            />
                          ) : (
                            <span className="font-medium">{item.actualStock ?? '-'}</span>
                          )}
                        </td>
                        <td className="text-center px-4 py-2.5">
                          {diff !== null ? (
                            <span className={`font-semibold text-sm ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                              {diff > 0 ? '+' : ''}{diff}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="text-center px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                            title="Hapus dari keranjang"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {cartItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">
                        Cari produk lalu klik + untuk menambahkan ke keranjang
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
        <Button variant="outline" onClick={onBack}>Tutup</Button>
        {isActive && isAdmin && (
          <Button onClick={() => setShowComplete(true)} icon={HiCheck}>
            Simpan
          </Button>
        )}
      </div>

      {/* Complete Confirmation */}
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
