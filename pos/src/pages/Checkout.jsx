import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiArrowLeft, HiCash, HiCreditCard, HiOfficeBuilding, HiCheck } from 'react-icons/hi';
import useCartStore from '../stores/cartStore';
import { transactionAPI, unitAPI } from '../api/endpoints';
import { formatRupiah } from '../utils/formatCurrency';
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from '../utils/constants';
import { Button } from '../components/common';
import ReceiptPrint from '../components/receipt/ReceiptPrint';

const paymentTypes = [
  { type: TRANSACTION_TYPES.CASH, label: 'Tunai', icon: HiCash, color: 'bg-blue-600 hover:bg-blue-700', activeColor: 'ring-blue-500' },
  { type: TRANSACTION_TYPES.BON, label: 'Bon', icon: HiCreditCard, color: 'bg-orange-500 hover:bg-orange-600', activeColor: 'ring-orange-500' },
  { type: TRANSACTION_TYPES.ANGGARAN, label: 'Anggaran', icon: HiOfficeBuilding, color: 'bg-purple-600 hover:bg-purple-700', activeColor: 'ring-purple-500' },
];

const quickAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [receiptData, setReceiptData] = useState(null);

  const {
    items, discount, notes, customerName, customerPhone, unitLembagaId, paymentType, paidAmount,
    setPaymentType, setPaidAmount, setNotes, setCustomerName, setCustomerPhone, setUnitLembagaId,
    getSubtotal, getGrandTotal, getChange, clearCart,
  } = useCartStore();

  const grandTotal = getGrandTotal();
  const change = getChange();
  const subtotal = getSubtotal();

  const { data: unitLembagaList } = useQuery({
    queryKey: ['unit-lembaga'],
    queryFn: () => unitAPI.getLembaga(),
    select: (res) => res.data.data || [],
    staleTime: 300000,
  });

  const createMutation = useMutation({
    mutationFn: transactionAPI.create,
    onSuccess: (res) => {
      toast.success('Transaksi berhasil!');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setReceiptData(res.data.data);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Gagal membuat transaksi');
    },
  });

  const handleSubmit = () => {
    if (items.length === 0) {
      toast.error('Keranjang kosong');
      return;
    }

    if (paymentType === 'CASH' && paidAmount < grandTotal) {
      toast.error('Jumlah pembayaran kurang');
      return;
    }

    const payload = {
      type: paymentType,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.unitPrice,
        unitId: item.unitId,
      })),
      discount: discount || 0,
      paidAmount: paymentType === 'CASH' ? paidAmount : grandTotal,
      notes: notes || undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      unitLembagaId: unitLembagaId || undefined,
    };

    createMutation.mutate(payload);
  };

  const handleReceiptClose = () => {
    setReceiptData(null);
    clearCart();
    navigate('/kasir');
  };

  if (items.length === 0 && !receiptData) {
    navigate('/kasir');
    return null;
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-gray-50">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Back button */}
        <button
          onClick={() => navigate('/kasir')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <HiArrowLeft className="w-4 h-4" />
          Kembali ke Kasir
        </button>

        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Ringkasan Pesanan</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.product?.name} x{item.quantity}
                </span>
                <span className="font-medium">{formatRupiah(item.quantity * item.unitPrice)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Diskon</span>
                <span>-{formatRupiah(discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-blue-600">{formatRupiah(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Tipe Pembayaran</h3>
          <div className="grid grid-cols-3 gap-3">
            {paymentTypes.map((pt) => (
              <button
                key={pt.type}
                onClick={() => setPaymentType(pt.type)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl text-white transition-all ${pt.color} ${
                  paymentType === pt.type ? `ring-4 ${pt.activeColor} ring-offset-2 scale-105` : 'opacity-70'
                }`}
              >
                <pt.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{pt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cash Payment */}
        {paymentType === 'CASH' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Pembayaran Tunai</h3>

            {/* Quick amounts */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setPaidAmount(amount)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    paidAmount === amount
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {formatRupiah(amount)}
                </button>
              ))}
            </div>

            {/* Exact amount button */}
            <button
              onClick={() => setPaidAmount(grandTotal)}
              className="w-full mb-3 py-2 bg-green-50 border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-100 transition-colors"
            >
              Uang Pas ({formatRupiah(grandTotal)})
            </button>

            {/* Custom amount */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Uang Diterima</label>
              <input
                type="number"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-bold text-right outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
              />
            </div>

            {/* Change display */}
            <div className={`mt-3 p-4 rounded-xl text-center ${
              change >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className="text-sm text-gray-600 mb-1">Kembalian</p>
              <p className={`text-3xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatRupiah(Math.abs(change))}
              </p>
              {change < 0 && <p className="text-xs text-red-500 mt-1">Pembayaran kurang</p>}
            </div>
          </div>
        )}

        {/* BON / Anggaran - Unit Lembaga */}
        {(paymentType === 'BON' || paymentType === 'ANGGARAN') && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Info {TRANSACTION_TYPE_LABELS[paymentType]}</h3>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Unit Lembaga</label>
              <select
                value={unitLembagaId}
                onChange={(e) => setUnitLembagaId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Unit Lembaga --</option>
                {(unitLembagaList || []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Nama Pengambil</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama pengambil barang"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">No. Telepon</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tambahkan catatan..."
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Submit button */}
        <Button
          size="lg"
          className="w-full"
          icon={HiCheck}
          loading={createMutation.isPending}
          disabled={paymentType === 'CASH' && paidAmount < grandTotal}
          onClick={handleSubmit}
        >
          Konfirmasi & Cetak Struk
        </Button>

        <div className="h-4" />
      </div>

      {/* Receipt Modal */}
      {receiptData && (
        <ReceiptPrint
          transaction={receiptData}
          paidAmount={paymentType === 'CASH' ? paidAmount : grandTotal}
          change={paymentType === 'CASH' ? change : 0}
          onClose={handleReceiptClose}
        />
      )}
    </div>
  );
}
