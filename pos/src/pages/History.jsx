import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HiSearch, HiRefresh, HiPrinter, HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { transactionAPI } from '../api/endpoints';
import { formatRupiah } from '../utils/formatCurrency';
import { formatWaktu, formatTanggal } from '../utils/formatDate';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS, TRANSACTION_STATUS_LABELS, TRANSACTION_STATUS_COLORS } from '../utils/constants';
import { Badge, Loading, EmptyState } from '../components/common';
import ReceiptPrint from '../components/receipt/ReceiptPrint';

export default function History() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['transactions-today', startDate],
    queryFn: () => transactionAPI.getAll({ startDate, endDate, limit: 100 }),
    select: (res) => {
      const d = res.data.data;
      return Array.isArray(d) ? d : d?.transactions || [];
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

  const handlePrint = async (trx) => {
    try {
      const { data: res } = await transactionAPI.getById(trx.id);
      setReceiptData(res.data);
    } catch {
      setReceiptData(trx);
    }
  };

  const todayTotal = (transactions || [])
    .filter((t) => t.status !== 'CANCELLED')
    .reduce((sum, t) => sum + parseFloat(t.total || t.totalAmount || 0), 0);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Riwayat Transaksi</h2>
            <p className="text-sm text-gray-500">
              {formatTanggal(today)} &middot; {(transactions || []).length} transaksi &middot; Total: <span className="font-semibold text-blue-600">{formatRupiah(todayTotal)}</span>
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <HiRefresh className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. transaksi atau pelanggan..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <Loading text="Memuat riwayat..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi"
            description="Transaksi hari ini akan muncul di sini"
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((trx) => {
              const isExpanded = expandedId === trx.id;
              return (
                <div key={trx.id} className="bg-white">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : trx.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900">{trx.transactionNumber}</span>
                        <Badge size="sm" colorClass={TRANSACTION_TYPE_COLORS[trx.type]}>
                          {TRANSACTION_TYPE_LABELS[trx.type]}
                        </Badge>
                        <Badge size="sm" colorClass={TRANSACTION_STATUS_COLORS[trx.status]}>
                          {TRANSACTION_STATUS_LABELS[trx.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatWaktu(trx.createdAt)}</span>
                        {trx.customerName && <span>{trx.customerName}</span>}
                        {trx.items && <span>{trx.items.length} item</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">
                        {formatRupiah(trx.total || trx.totalAmount)}
                      </span>
                      {isExpanded ? (
                        <HiChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <HiChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100">
                      <div className="py-2 space-y-1">
                        {(trx.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-600">
                            <span>{item.product?.name || '-'} x{item.quantity}</span>
                            <span>{formatRupiah(item.subtotal || item.quantity * (item.price || 0))}</span>
                          </div>
                        ))}
                      </div>
                      {trx.notes && (
                        <p className="text-xs text-gray-500 mt-1">Catatan: {trx.notes}</p>
                      )}
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handlePrint(trx)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <HiPrinter className="w-3.5 h-3.5" />
                          Cetak Ulang
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
