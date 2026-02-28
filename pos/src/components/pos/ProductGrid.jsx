import ProductListItem from './ProductListItem';
import { EmptyState } from '../common';

export default function ProductGrid({ products, isLoading, onAddToCart }) {
  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 px-4 border-b border-gray-100 animate-pulse">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-48 mb-1.5" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
            <div className="w-16 h-8 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <EmptyState
        title="Produk tidak ditemukan"
        description="Coba kata kunci lain atau scan barcode produk"
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-600 text-white px-4 py-2.5">
        <h3 className="text-sm font-semibold">
          Daftar Produk
          <span className="ml-2 text-xs font-normal text-gray-300">
            (CTRL + Down / Up)
          </span>
        </h3>
      </div>

      {/* Product List */}
      <div className="divide-y divide-gray-100">
        {products.map((product) => (
          <ProductListItem
            key={product.id}
            product={product}
            onAdd={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
}
