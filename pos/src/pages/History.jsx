import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiSearch, HiPrinter, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { transactionAPI } from '../api/endpoints';
import { formatRupiah } from '../utils/formatCurrency';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '../utils/constants';
import { Loading, EmptyState } from '../components/common';
import ReceiptPrint from '../components/receipt/ReceiptPrint';
import { printReceipt, isRectaConfigured } from '../utils/printerService';
import DualCalendar from '../components/common/DualCalendar';

export default function History() {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Date filter state
  const [filterStart, setFilterStart] = useState(null);
  const [filterEnd, setFilterEnd] = useState(null);

  // Build query params with local timezone ISO dates
  const queryParams = useMemo(() => {
    const params = { limit: 500, sortBy: 'createdAt', sortOrder: 'desc' };
    if (filterStart && filterEnd) {
      const [sy, sm, sd] = filterStart.split('-').map(Number);
      const [ey, em, ed] = filterEnd.split('-').map(Number);
      params.startDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0).toISOString();
      params.endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999).toISOString();
    }
    return params;
  }, [filterStart, filterEnd]);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions-history', filterStart, filterEnd],
    queryFn: () => transactionAPI.getAll(queryParams),
    select: (res) => {
      return res.data.data || [];
    },
    refetchInterval: 30000,
  });

  const filtered = (transactions || []).filter((trx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      trx.transactionNumber?.toLowerCase().includes(q) ||
      trx.customerName?.toLowerCase().includes(q)
    );
  });

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const startIdx = (page - 1) * rowsPerPage;
  const endIdx = Math.min(startIdx + rowsPerPage, totalItems);
  const paginated = filtered.slice(startIdx, endIdx);

  const handleDateApply = (start, end) => {
    setFilterStart(start);
    setFilterEnd(end);
    setPage(1);
  };

  const handleDateReset = () => {
    setFilterStart(null);
    setFilterEnd(null);
    setPage(1);
  };

  const handlePrint = async (trx) => {
    try {
      const { data: res } = await transactionAPI.getById(trx.id);
      const txData = res.data;

      // Auto-print via Recta if configured
      if (isRectaConfigured()) {
        const result = await printReceipt(txData);
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
          // Show preview modal as fallback
          setReceiptData(txData);
        }
      } else {
        setReceiptData(txData);
      }
    } catch {
      setReceiptData(trx);
    }
  };

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-gray-50">
      {/* Date Filter Bar */}
      <div className="px-4 pt-4 pb-2">
        <DualCalendar
          startDate={filterStart}
          endDate={filterEnd}
          onApply={handleDateApply}
          onReset={handleDateReset}
          isCustomFilter={!!(filterStart && filterEnd)}
        />
      </div>

      {/* Table Container */}
      <div className="flex-1 flex flex-col mx-4 mb-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Transaksi</h2>
          <div className="flex items-center gap-3">
            {showSearch && (
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Cari..."
                className="px-3 py-1.5 rounded-lg text-sm outline-none w-48"
                autoFocus
              />
            )}
            <span className="text-white text-sm">Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1 rounded text-sm border border-white/30 bg-white/20 text-white outline-none"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n} className="text-gray-900">{n}</option>
              ))}
            </select>
            <span className="text-white text-sm">
              {totalItems === 0 ? '0' : `${startIdx + 1} – ${endIdx}`} of {totalItems}
            </span>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <HiChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="number"
              value={page}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= totalPages) setPage(v);
              }}
              className="w-10 text-center rounded text-sm py-1 outline-none"
              min={1}
              max={totalPages}
            />
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <HiChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30"
            >
              <HiSearch className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <Loading text="Memuat riwayat..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={filterStart && filterEnd ? 'Tidak ada transaksi pada rentang tanggal ini' : 'Belum ada transaksi'}
              description={filterStart && filterEnd ? 'Coba pilih rentang tanggal yang berbeda' : 'Semua transaksi akan muncul di sini'}
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">No.</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">ID / Tgl.</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Transaksi</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Konsumen</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Produk</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((trx, idx) => (
                  <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                    {/* No */}
                    <td className="px-4 py-3 text-gray-500 align-top">{startIdx + idx + 1}</td>

                    {/* ID / Tgl */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900 whitespace-nowrap">{trx.transactionNumber}</div>
                      <div className="text-xs text-blue-500">{formatDateTime(trx.createdAt)}</div>
                    </td>

                    {/* Transaksi */}
                    <td className="px-4 py-3 align-top">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TRANSACTION_TYPE_COLORS[trx.type] || 'bg-gray-100 text-gray-800'}`}>{TRANSACTION_TYPE_LABELS[trx.type] || trx.type}</span>
                    </td>

                    {/* Konsumen */}
                    <td className="px-4 py-3 align-top text-gray-700 uppercase">
                      {trx.customerName || '-'}
                    </td>

                    {/* Produk */}
                    <td className="px-4 py-3 align-top">
                      <ul className="space-y-0.5">
                        {(trx.items || []).map((item, i) => {
                          const name = item.product?.name || '-';
                          const qty = item.quantity;
                          const price = parseFloat(item.price || 0);
                          const sub = parseFloat(item.subtotal || qty * price);
                          return (
                            <li key={i} className="text-gray-600 text-xs">
                              • {name} ({qty} PCS x {formatRupiah(price)} = {formatRupiah(sub)})
                            </li>
                          );
                        })}
                      </ul>
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 align-top text-right font-medium text-gray-900 whitespace-nowrap">
                      {formatRupiah(trx.total)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handlePrint(trx)}
                          className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                          title="Cetak Struk"
                        >
                          <HiPrinter className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptPrint
          transaction={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
}
