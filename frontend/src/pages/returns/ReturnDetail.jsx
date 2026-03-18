import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HiArrowLeft } from 'react-icons/hi';
import { returnAPI } from '../../api/endpoints';
import { Card, Badge, Loading, Table } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggalWaktu } from '../../utils/formatDate';

export default function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: ret, isLoading } = useQuery({
    queryKey: ['return', id],
    queryFn: async () => {
      const { data } = await returnAPI.getById(id);
      return data.data;
    },
  });

  if (isLoading) return <Loading text="Memuat detail retur..." />;
  if (!ret) return <p className="text-center text-gray-500 py-12">Data retur tidak ditemukan</p>;

  const itemColumns = [
    {
      key: 'product',
      header: 'Produk',
      render: (_, row) => (
        <p className="font-medium text-gray-900">{row.product?.name || '-'}</p>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty Retur',
      render: (v) => <span className="font-medium">{v}</span>,
    },
    {
      key: 'price',
      header: 'Harga',
      render: (v) => formatRupiah(v),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (v) => <span className="font-medium text-gray-900">{formatRupiah(v)}</span>,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/retur')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <HiArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ret.returnNumber}</h1>
          <p className="text-sm text-gray-500">{formatTanggalWaktu(ret.createdAt)}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Informasi Retur" padding="md">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">No. Retur</span>
              <span className="text-sm font-mono font-medium">{ret.returnNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">No. Transaksi</span>
              <span className="text-sm font-mono text-blue-600 cursor-pointer hover:underline"
                onClick={() => navigate(`/transaksi/${ret.transaction?.id}`)}>
                {ret.transaction?.transactionNumber || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Refund</span>
              <span className="text-sm font-bold text-red-600">{formatRupiah(ret.refundAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Dibuat Oleh</span>
              <span className="text-sm">{ret.creator?.fullName || '-'}</span>
            </div>
            {ret.reason && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Alasan</p>
                <p className="text-sm text-gray-700">{ret.reason}</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Transaksi Asal" padding="md">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Customer</span>
              <span className="text-sm">{ret.transaction?.customerName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total Transaksi</span>
              <span className="text-sm font-medium">{formatRupiah(ret.transaction?.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card title={`Item Retur (${ret.items?.length || 0})`} padding="none">
        <Table
          columns={itemColumns}
          data={ret.items || []}
          emptyMessage="Tidak ada item"
        />
        {ret.items?.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Refund</p>
              <p className="text-xl font-bold text-red-600">{formatRupiah(ret.refundAmount)}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
