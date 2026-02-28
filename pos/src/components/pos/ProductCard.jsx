import { HiPlus } from 'react-icons/hi';
import { formatRupiah } from '../../utils/formatCurrency';

export default function ProductCard({ product, onAdd }) {
  const stock = product.stock || 0;
  const isOutOfStock = stock <= 0;
  const imageUrl = product.image
    ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}/uploads/${product.image}`
    : null;

  return (
    <button
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={`w-full text-left bg-white rounded-xl border transition-all p-3 ${
        isOutOfStock
          ? 'border-gray-200 opacity-60 cursor-not-allowed'
          : 'border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer active:scale-[0.98]'
      }`}
    >
      {/* Image */}
      <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )}
      </div>

      {/* Info */}
      <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
      <p className="text-xs text-gray-400 truncate">{product.sku}</p>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-sm font-bold text-blue-600">{formatRupiah(product.sellPrice)}</p>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            isOutOfStock
              ? 'bg-red-100 text-red-700'
              : stock <= (product.minStock || 5)
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {stock} {product.unitOfMeasure?.abbreviation || product.unit || 'pcs'}
        </span>
      </div>

      {!isOutOfStock && (
        <div className="mt-2 flex items-center justify-center gap-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
          <HiPlus className="w-3.5 h-3.5" />
          Tambah
        </div>
      )}
    </button>
  );
}
