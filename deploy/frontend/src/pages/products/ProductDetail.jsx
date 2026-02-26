import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HiPencil, HiArrowLeft, HiPrinter } from 'react-icons/hi';
import { productAPI, stockAPI } from '../../api/endpoints';
import { Card, Badge, Button, Loading, Table, Breadcrumb } from '../../components/common';
import BarcodePrint from '../../components/BarcodePrint';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggalWaktu } from '../../utils/formatDate';
import { MOVEMENT_TYPE_LABELS, MOVEMENT_TYPE_COLORS } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import { useState, useRef } from 'react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isOperator } = useAuth();
  const printRef = useRef();
  const [showPrint, setShowPrint] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { const { data } = await productAPI.getById(id); return data.data; },
  });

  const { data: stockData } = useQuery({
    queryKey: ['stock-detail', id],
    queryFn: async () => { const { data } = await stockAPI.getByProduct(id, { limit: 10 }); return data.data; },
    enabled: !!id,
  });

  if (isLoading) return <Loading text="Memuat detail produk..." />;
  if (!product) return <p className="text-center text-gray-500 py-12">Produk tidak ditemukan</p>;

  const variantColumns = [
    { key: 'name', header: 'Nama Varian' },
    { key: 'sku', header: 'SKU', render: (v) => <span className="font-mono text-xs">{v}</span> },
    { key: 'buyPrice', header: 'Harga Beli', render: (v) => formatRupiah(v) },
    { key: 'sellPrice', header: 'Harga Jual', render: (v) => formatRupiah(v) },
    { key: 'stock', header: 'Stok', render: (v) => <span className="font-semibold">{v}</span> },
  ];

  const priceHistoryColumns = [
    { key: 'createdAt', header: 'Tanggal', render: (v) => formatTanggalWaktu(v) },
    { key: 'oldBuy', header: 'Beli Lama', render: (v) => formatRupiah(v) },
    { key: 'newBuy', header: 'Beli Baru', render: (v) => formatRupiah(v) },
    { key: 'oldSell', header: 'Jual Lama', render: (v) => formatRupiah(v) },
    { key: 'newSell', header: 'Jual Baru', render: (v) => formatRupiah(v) },
    { key: 'user', header: 'Diubah Oleh', render: (_, row) => row.user?.fullName || '-' },
  ];

  const movementColumns = [
    { key: 'createdAt', header: 'Tanggal', render: (v) => formatTanggalWaktu(v) },
    {
      key: 'type', header: 'Tipe',
      render: (v) => <Badge colorClass={MOVEMENT_TYPE_COLORS[v]} size="sm">{MOVEMENT_TYPE_LABELS[v] || v}</Badge>,
    },
    { key: 'quantity', header: 'Jumlah', render: (v, row) => (
      <span className={row.type === 'IN' ? 'text-green-600 font-medium' : row.type === 'OUT' ? 'text-red-600 font-medium' : 'font-medium'}>
        {row.type === 'IN' ? '+' : row.type === 'OUT' ? '-' : ''}{Math.abs(v)}
      </span>
    )},
    { key: 'previousStock', header: 'Stok Sebelum' },
    { key: 'newStock', header: 'Stok Sesudah' },
    { key: 'notes', header: 'Catatan', render: (v) => <span className="text-xs text-gray-500">{v || '-'}</span> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'Produk', to: '/produk' }, { label: product?.name || 'Detail' }]} className="mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/produk')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <HiArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-sm text-gray-500 font-mono">{product.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {product.barcode && (
            <Button variant="outline" size="sm" icon={HiPrinter} onClick={() => setShowPrint(true)}>
              Cetak Barcode
            </Button>
          )}
          {(isAdmin || isOperator) && (
            <Button icon={HiPencil} size="sm" onClick={() => navigate(`/produk/${id}/edit`)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="aspect-square bg-gray-50 flex items-center justify-center">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">Tidak ada foto</span>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Kategori</p>
                <p className="text-sm font-medium text-gray-900">{product.category?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Merek</p>
                <p className="text-sm font-medium text-gray-900">{product.brand?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Supplier</p>
                <p className="text-sm font-medium text-gray-900">{product.supplier?.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Harga Beli</p>
                <p className="text-sm font-semibold text-gray-900">{formatRupiah(product.buyPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Harga Jual</p>
                <p className="text-sm font-semibold text-blue-600">{formatRupiah(product.sellPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Satuan</p>
                <p className="text-sm font-medium text-gray-900">
                  {product.unitOfMeasure?.name || product.unit}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Stok</p>
                <p className={`text-lg font-bold ${product.stock < product.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                  {product.stock}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Stok Minimum</p>
                <p className="text-sm font-medium text-gray-900">{product.minStock}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Barcode</p>
                <p className="text-sm font-mono text-gray-900">{product.barcode || '-'}</p>
              </div>
            </div>
            {product.description && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Deskripsi</p>
                <p className="text-sm text-gray-700">{product.description}</p>
              </div>
            )}
          </Card>

          {/* Unit conversions */}
          {product.productUnits?.length > 0 && (
            <Card title="Satuan & Konversi" padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Satuan</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Faktor Konversi</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Satuan Dasar</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {product.productUnits.map((pu) => (
                      <tr key={pu.id || pu.unitId}>
                        <td className="px-6 py-3">{pu.unit?.name} ({pu.unit?.abbreviation})</td>
                        <td className="text-center px-4 py-3 font-mono">{Number(pu.conversionFactor)}</td>
                        <td className="text-center px-4 py-3">
                          {pu.isBaseUnit && <Badge variant="info" size="sm">Dasar</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Variants */}
      {product.variants?.length > 0 && (
        <Card title={`Varian (${product.variants.length})`} padding="none">
          <Table columns={variantColumns} data={product.variants} emptyMessage="Tidak ada varian" />
        </Card>
      )}

      {/* Price History */}
      {product.priceHistories?.length > 0 && (
        <Card title="Riwayat Perubahan Harga" padding="none">
          <Table columns={priceHistoryColumns} data={product.priceHistories} emptyMessage="Belum ada perubahan harga" />
        </Card>
      )}

      {/* Stock Movement History */}
      <Card title="Riwayat Pergerakan Stok (10 Terakhir)" padding="none">
        <Table
          columns={movementColumns}
          data={stockData?.history?.data || []}
          loading={!stockData}
          emptyMessage="Belum ada pergerakan stok"
        />
      </Card>

      {/* Barcode Print */}
      {showPrint && product.barcode && (
        <BarcodePrint
          products={[product]}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}
