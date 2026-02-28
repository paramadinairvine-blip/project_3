import { useNavigate } from 'react-router-dom';
import { HiShoppingCart, HiTrash } from 'react-icons/hi';
import useCartStore from '../../stores/cartStore';
import CartItem from './CartItem';
import { formatRupiah } from '../../utils/formatCurrency';
import { Button, EmptyState } from '../common';

export default function Cart() {
  const navigate = useNavigate();
  const { items, discount, getSubtotal, getGrandTotal, getItemCount, updateQuantity, removeItem, clearCart, setDiscount } = useCartStore();

  const subtotal = getSubtotal();
  const grandTotal = getGrandTotal();
  const itemCount = getItemCount();

  const hasOverStock = items.some((i) => i.quantity > (i.product?.stock || 0));

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <HiShoppingCart className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Keranjang</h3>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="Keranjang kosong"
            description="Cari dan tambahkan produk untuk memulai transaksi"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <HiShoppingCart className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            Keranjang
            <span className="ml-1.5 text-xs font-normal text-gray-500">({itemCount} item)</span>
          </h3>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
        >
          <HiTrash className="w-3.5 h-3.5" />
          Kosongkan
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.map((item) => (
          <CartItem
            key={item.productId}
            item={item}
            onUpdateQty={updateQuantity}
            onRemove={removeItem}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatRupiah(subtotal)}</span>
        </div>

        {/* Discount input */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Diskon</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-xs">Rp</span>
            <input
              type="number"
              value={discount || ''}
              onChange={(e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="w-24 text-right text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
              min="0"
            />
          </div>
        </div>

        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
          <span>Total</span>
          <span className="text-blue-600">{formatRupiah(grandTotal)}</span>
        </div>

        <Button
          size="lg"
          className="w-full mt-2"
          disabled={hasOverStock}
          onClick={() => navigate('/checkout')}
        >
          {hasOverStock ? 'Stok tidak mencukupi' : `Proses Pembayaran`}
        </Button>
      </div>
    </div>
  );
}
