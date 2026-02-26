import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiArrowLeft, HiPencil, HiPaperAirplane, HiCheck, HiBan } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { purchaseOrderAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Card, Badge, Button, Loading, Table, Modal, Breadcrumb } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggalWaktu } from '../../utils/formatDate';
import { PO_STATUS, PO_STATUS_LABELS, PO_STATUS_COLORS } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import { useState } from 'react';

const TIMELINE_CONFIG = {
  DRAFT: { label: 'Draft Dibuat', color: 'bg-gray-400' },
  SENT: { label: 'Dikirim ke Supplier', color: 'bg-blue-500' },
  RECEIVED: { label: 'Barang Diterima', color: 'bg-green-500' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-red-500' },
};

function StatusTimeline({ status, createdAt, updatedAt }) {
  const flow = ['DRAFT', 'SENT', 'RECEIVED'];
  const cancelled = status === 'CANCELLED';

  const getStepState = (step) => {
    if (cancelled && step === 'CANCELLED') return 'current';
    if (cancelled) {
      const idx = flow.indexOf(step);
      const cancelPoint = flow.indexOf(status) >= 0 ? flow.indexOf(status) : 0;
      return idx <= cancelPoint ? 'done' : 'pending';
    }
    const currentIdx = flow.indexOf(status);
    const stepIdx = flow.indexOf(step);
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
  };

  const steps = cancelled ? [...flow.slice(0, flow.indexOf('SENT') + 1), 'CANCELLED'] : flow;

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const state = getStepState(step);
        const config = TIMELINE_CONFIG[step];
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  state === 'done' ? 'bg-green-500'
                    : state === 'current' ? config.color
                      : 'bg-gray-200'
                }`}
              >
                {state === 'done' ? '✓' : idx + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${
                state === 'pending' ? 'text-gray-400' : 'text-gray-700 font-medium'
              }`}>
                {config.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-1 ${
                state === 'done' ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isOperator } = useAuth();
  const canEdit = isAdmin || isOperator;

  const [actionModal, setActionModal] = useState(null);

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data } = await purchaseOrderAPI.getById(id);
      return data.data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => purchaseOrderAPI.send(id),
    onSuccess: () => {
      toast.success('PO berhasil dikirim');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      setActionModal(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal mengirim PO')),
  });

  const receiveMutation = useMutation({
    mutationFn: () => purchaseOrderAPI.receive(id),
    onSuccess: () => {
      toast.success('Barang berhasil diterima, stok diperbarui');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      setActionModal(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menerima barang')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => purchaseOrderAPI.cancel(id),
    onSuccess: () => {
      toast.success('PO berhasil dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
      setActionModal(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal membatalkan PO')),
  });

  const handleAction = () => {
    if (actionModal === 'send') sendMutation.mutate();
    else if (actionModal === 'receive') receiveMutation.mutate();
    else if (actionModal === 'cancel') cancelMutation.mutate();
  };

  const isActionLoading = sendMutation.isPending || receiveMutation.isPending || cancelMutation.isPending;

  const actionModalConfig = {
    send: {
      title: 'Kirim PO ke Supplier',
      message: 'PO akan dikirim ke supplier. Lanjutkan?',
      buttonText: 'Kirim',
      variant: 'primary',
    },
    receive: {
      title: 'Terima Barang',
      message: 'Konfirmasi penerimaan barang? Stok produk akan otomatis bertambah.',
      buttonText: 'Terima Barang',
      variant: 'primary',
    },
    cancel: {
      title: 'Batalkan PO',
      message: 'Apakah Anda yakin? Tindakan ini tidak dapat dibatalkan.',
      buttonText: 'Batalkan PO',
      variant: 'danger',
    },
  };

  if (isLoading) return <Loading text="Memuat detail PO..." />;
  if (!po) return <p className="text-center text-gray-500 py-12">Purchase Order tidak ditemukan</p>;

  const modalCfg = actionModalConfig[actionModal] || {};

  const itemColumns = [
    {
      key: 'product',
      header: 'Produk',
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.product?.name || '-'}</p>
          <p className="text-xs text-gray-500 font-mono">{row.product?.sku}</p>
        </div>
      ),
    },
    {
      key: 'variant',
      header: 'Varian',
      render: (_, row) => <span className="text-gray-600">{row.variant?.name || '-'}</span>,
    },
    {
      key: 'unit',
      header: 'Satuan',
      render: (_, row) => <span className="text-gray-600">{row.unit?.name || row.product?.unit || '-'}</span>,
    },
    {
      key: 'quantity',
      header: 'Jumlah',
      render: (v) => <span className="font-medium">{v}</span>,
    },
    {
      key: 'unitPrice',
      header: 'Harga Satuan',
      render: (v) => formatRupiah(v),
    },
    {
      key: 'totalPrice',
      header: 'Total',
      render: (v, row) => (
        <span className="font-medium text-gray-900">
          {formatRupiah(v || (row.quantity * row.unitPrice))}
        </span>
      ),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'Purchase Order', to: '/purchase-order' }, { label: po ? 'PO-' + po.poNumber : 'Detail' }]} className="mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/purchase-order')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Kembali">
            <HiArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
              <Badge colorClass={PO_STATUS_COLORS[po.status]} size="sm">
                {PO_STATUS_LABELS[po.status]}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">Dibuat {formatTanggalWaktu(po.createdAt)}</p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            {po.status === PO_STATUS.DRAFT && (
              <>
                <Button variant="outline" size="sm" icon={HiPencil} onClick={() => navigate(`/purchase-order/${id}/edit`)}>
                  Edit
                </Button>
                <Button size="sm" icon={HiPaperAirplane} onClick={() => setActionModal('send')}>
                  Kirim
                </Button>
                <Button variant="danger" size="sm" icon={HiBan} onClick={() => setActionModal('cancel')}>
                  Batalkan
                </Button>
              </>
            )}
            {po.status === PO_STATUS.SENT && (
              <>
                <Button size="sm" icon={HiCheck} onClick={() => setActionModal('receive')}>
                  Terima Barang
                </Button>
                <Button variant="danger" size="sm" icon={HiBan} onClick={() => setActionModal('cancel')}>
                  Batalkan
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <Card padding="md">
        <p className="text-sm font-medium text-gray-700 mb-4">Status PO</p>
        <div className="flex justify-center overflow-x-auto py-2">
          <StatusTimeline status={po.status} createdAt={po.createdAt} updatedAt={po.updatedAt} />
        </div>
      </Card>

      {/* PO Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Informasi PO" padding="md">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">No. PO</span>
              <span className="text-sm font-mono font-medium">{po.poNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Tanggal</span>
              <span className="text-sm">{formatTanggalWaktu(po.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-sm font-bold text-blue-600">{formatRupiah(po.totalAmount)}</span>
            </div>
            {po.notes && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Catatan</p>
                <p className="text-sm text-gray-700">{po.notes}</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Informasi Supplier" padding="md">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Nama</span>
              <span className="text-sm font-medium">{po.supplier?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Kontak</span>
              <span className="text-sm">{po.supplier?.contactPerson || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Telepon</span>
              <span className="text-sm">{po.supplier?.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm">{po.supplier?.email || '-'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card title={`Item Pesanan (${po.items?.length || 0})`} padding="none">
        <Table
          columns={itemColumns}
          data={po.items || []}
          emptyMessage="Tidak ada item"
        />
        {po.items?.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Keseluruhan</p>
              <p className="text-xl font-bold text-blue-600">{formatRupiah(po.totalAmount)}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Created/Updated info */}
      <div className="text-xs text-gray-400 text-right space-y-0.5">
        {po.createdBy && <p>Dibuat oleh: {po.createdBy.fullName}</p>}
        {po.updatedAt !== po.createdAt && <p>Terakhir diubah: {formatTanggalWaktu(po.updatedAt)}</p>}
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        title={modalCfg.title}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setActionModal(null)}>Batal</Button>
            <Button variant={modalCfg.variant} loading={isActionLoading} onClick={handleAction}>
              {modalCfg.buttonText}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">{modalCfg.message}</p>
      </Modal>
    </div>
  );
}
