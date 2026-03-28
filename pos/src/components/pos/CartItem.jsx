import { useState } from 'react';
import { HiMinus, HiPlus, HiTrash } from 'react-icons/hi';
import { formatRupiah } from '../../utils/formatCurrency';

export default function CartItem({ item, onUpdateQty, onRemove, productBaseQtyMap }) {
  const total = item.quantity * item.unitPrice;
  const stock = item.product?.stock || 0;
  const conversionFactor = item.conversionFactor || 1;
  const maxQty = Math.floor(stock / conversionFactor);
  const [editValue, setEditValue] = useState(null);

  // Check if total base qty of this product across all units exceeds stock
  const totalBaseQty = productBaseQtyMap?.[item.productId] || (item.quantity * conversionFactor);
  const isOverStock = totalBaseQty > stock;

  const baseUnitName = item.product?.unitOfMeasure?.abbreviation || item.product?.unit || 'pcs';

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-0 ${isOverStock ? 'bg-red-50 -mx-3 px-3 rounded-lg' : ''}`}>
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name}</p>
        <p className="text-xs text-gray-500">
          {formatRupiah(item.unitPrice)} / {item.unitName}
        </p>
        {isOverStock && (
          <p className="text-xs text-red-600 mt-0.5">
            Stok tersedia: {stock} {baseUnitName} (terpakai: {totalBaseQty} {baseUnitName})
          </p>
        )}
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => item.quantity > 1 ? onUpdateQty(item.cartKey, item.quantity - 1) : onRemove(item.cartKey)}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
        >
          {item.quantity <= 1 ? <HiTrash className="w-3.5 h-3.5 text-red-500" /> : <HiMinus className="w-3.5 h-3.5" />}
        </button>
        <input
          type="number"
          value={editValue !== null ? editValue : item.quantity}
          onFocus={(e) => {
            setEditValue(e.target.value);
            e.target.select();
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setEditValue(raw);
            // Update store langsung agar warning merah muncul real-time
            const val = parseInt(raw) || 1;
            onUpdateQty(item.cartKey, Math.max(1, val));
          }}
          onBlur={() => {
            // Auto-cap ke stok maksimal saat keluar input
            const val = parseInt(editValue) || 1;
            const capped = Math.max(1, Math.min(val, maxQty));
            onUpdateQty(item.cartKey, capped);
            setEditValue(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.target.blur();
            }
          }}
          className={`w-10 h-7 text-center text-sm font-medium border rounded-lg outline-none ${
            isOverStock ? 'border-red-300 text-red-600' : 'border-gray-200'
          }`}
          min="1"
        />
        <button
          onClick={() => {
            const maxQty = Math.floor(stock / conversionFactor);
            if (item.quantity < maxQty) {
              onUpdateQty(item.cartKey, item.quantity + 1);
            }
          }}
          disabled={item.quantity >= Math.floor(stock / conversionFactor)}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            item.quantity >= Math.floor(stock / conversionFactor)
              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}
        >
          <HiPlus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Total */}
      <div className="text-right flex-shrink-0 w-24">
        <p className="text-sm font-semibold text-gray-900">{formatRupiah(total)}</p>
      </div>

      {/* Delete */}
      <button
        onClick={() => onRemove(item.cartKey)}
        className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
      >
        <HiTrash className="w-4 h-4" />
      </button>
    </div>
  );
}
