import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HiPlus, HiPencil, HiEye, HiPaperAirplane, HiCheck, HiBan } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { purchaseOrderAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Table, Badge, Button, SearchBar, Pagination, Modal } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggal } from '../../utils/formatDate';
import { PO_STATUS, PO_STATUS_LABELS, PO_STATUS_COLORS } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

const STATUS_TABS = [
  { key: '', label: 'Semua' },
  { key: PO_STATUS.DRAFT, label: 'Draft' },
  { key: PO_STATUS.SENT, label: 'Terkirim' },
  { key: PO_STATUS.RECEIVED, label: 'Diterima' },
  { key: PO_STATUS.CANCELLED, label: 'Dibatalkan' },
];

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { isAdmin, isOperator } = useAuth();
  const canEdit = isAdmin || isOperator;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [actionModal, setActionModal] = useState(null); // { type: 'send'|'receive'|'cancel', po }

  const supplierFilter = searchParams.get('supplier') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', { page, search, status: statusFilter, supplier: supplierFilter }],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (supplierFilter) params.supplierId = supplierFilter;
      const { data: res } = await purchaseOrderAPI.getAll(params);
      return res;
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id) => purchaseOrderAPI.send(id),
    onSuccess: () => {
      toast.success('PO berhasil dikirim ke supplier');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setActionModal(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal mengirim PO')),
  });

  const receiveMutation = useMutation({
    mutationFn: (id) => purchaseOrderAPI.receive(id),
    onSuccess: () => {
      toast.success('Barang PO berhasil diterima, stok diperbarui');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setActionModal(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menerima barang')),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => purchaseOrderAPI.cancel(id),
    onSuccess: () => {
      toast.success('PO berhasil dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setActionModal(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal membatalkan PO')),
  });

  const orders = data?.data || [];
  const pagination = data?.pagination || {};

  const handleAction = () => {
    if (!actionModal) return;
    const { type, po } = actionModal;
    if (type === 'send') sendMutation.mutate(po.id);
    else if (type === 'receive') receiveMutation.mutate(po.id);
    else if (type === 'cancel') cancelMutation.mutate(po.id);
  };

  const isActionLoading = sendMutation.isPending || receiveMutation.isPending || cancelMutation.isPending;

  const getActionModalText = () => {
    if (!actionModal) return {};
    const { type, po } = actionModal;
    switch (type) {
      case 'send': return {
        title: 'Kirim PO ke Supplier',
        message: `Kirim PO ${po.poNumber} ke supplier ${po.supplier?.name || ''}? Status akan berubah menjadi "Terkirim".`,
        buttonText: 'Kirim PO',
        buttonVariant: 'primary',
      };
      case 'receive': return {
        title: 'Terima Barang PO',
        message: `Konfirmasi penerimaan barang PO ${po.poNumber}? Stok produk akan otomatis bertambah sesuai item PO.`,
        buttonText: 'Terima Barang',
        buttonVariant: 'primary',
      };
      case 'cancel': return {
        title: 'Batalkan PO',
        message: `Apakah Anda yakin ingin membatalkan PO ${po.poNumber}? Tindakan ini tidak dapat dibatalkan.`,
        buttonText: 'Batalkan PO',
        buttonVariant: 'danger',
      };
      default: return {};
    }
  };

  const modalText = getActionModalText();

  const columns = [
    {
      key: 'poNumber',
      header: 'No. PO',
      sortable: true,
      render: (v) => <span className="font-medium font-mono text-gray-900">{v}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (_, row) => (
        <span className="text-gray-700">{row.supplier?.name || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Tanggal',
      sortable: true,
      render: (v) => <span className="text-gray-600">{formatTanggal(v)}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      sortable: true,
      render: (v) => <span className="font-medium text-gray-900">{formatRupiah(v)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <Badge colorClass={PO_STATUS_COLORS[v]} size="sm">
          {PO_STATUS_LABELS[v] || v}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      width: '160px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/purchase-order/${row.id}`); }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Lihat Detail"
            aria-label="Lihat Detail"
          >
            <HiEye className="w-4 h-4" />
          </button>

          {canEdit && row.status === PO_STATUS.DRAFT && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/purchase-order/${row.id}/edit`); }}
                className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                title="Edit"
                aria-label="Edit PO"
              >
                <HiPencil className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'send', po: row }); }}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Kirim ke Supplier"
                aria-label="Kirim ke Supplier"
              >
                <HiPaperAirplane className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'cancel', po: row }); }}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Batalkan"
                aria-label="Batalkan PO"
              >
                <HiBan className="w-4 h-4" />
              </button>
            </>
          )}

          {canEdit && row.status === PO_STATUS.SENT && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'receive', po: row }); }}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Terima Barang"
                aria-label="Terima Barang"
              >
                <HiCheck className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActionModal({ type: 'cancel', po: row }); }}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Batalkan"
                aria-label="Batalkan PO"
              >
                <HiBan className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola pemesanan barang ke supplier</p>
        </div>
        {canEdit && (
          <Button icon={HiPlus} onClick={() => navigate('/purchase-order/tambah')}>
            Buat PO Baru
          </Button>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <SearchBar
        placeholder="Cari nomor PO atau supplier..."
        onSearch={(v) => { setSearch(v); setPage(1); }}
        className="max-w-md"
      />

      {/* Table */}
      <Table
        columns={columns}
        data={orders}
        loading={isLoading}
        sortable
        onRowClick={(row) => navigate(`/purchase-order/${row.id}`)}
        emptyMessage="Tidak ada purchase order ditemukan"
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        title={modalText.title}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setActionModal(null)}>Batal</Button>
            <Button
              variant={modalText.buttonVariant}
              loading={isActionLoading}
              onClick={handleAction}
            >
              {modalText.buttonText}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">{modalText.message}</p>
      </Modal>
    </div>
  );
}
