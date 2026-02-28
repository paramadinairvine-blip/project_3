import { formatRupiah } from '../../utils/formatCurrency';

export default function ProductCard({ product, onAdd }) {
  const stock = product.stock || 0;
  const isOutOfStock = stock <= 0;
  const categoryName = product.category?.name || '';
  const brandName = product.brand?.name || '';
  const unitName = product.unitOfMeasure?.abbreviation || product.unit || 'pcs';
  const subtitle = [brandName, categoryName].filter(Boolean).join(' - ');

  return (
    <div
      className={`flex items-center justify-between py-2.5 px-3 border-b border-gray-100 last:border-0 transition-colors ${
        isOutOfStock ? 'opacity-50' : 'hover:bg-blue-50'
      }`}
    >
      {/* Product Info */}
      <div className="flex-1 min-w-0 mr-3">
        <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-medium text-blue-600">{formatRupiah(product.sellPrice)}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            isOutOfStock
              ? 'bg-red-100 text-red-600'
              : stock <= (product.minStock || 5)
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-50 text-green-600'
          }`}>
            {stock} {unitName}
          </span>
        </div>
      </div>

      {/* Buy Button */}
      <button
        onClick={() => !isOutOfStock && onAdd(product)}
        disabled={isOutOfStock}
        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
          isOutOfStock
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-cyan-500 text-white hover:bg-cyan-600 active:scale-95'
        }`}
      >
        {isOutOfStock ? 'Habis' : 'Beli'}
      </button>
    </div>
  );
}
