import ProductCard from './ProductCard';
import { EmptyState } from '../common';

export default function ProductGrid({ products, isLoading, onAddToCart }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 px-3 border-b border-gray-100 animate-pulse">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-40 mb-1.5" />
              <div className="h-3 bg-gray-200 rounded w-28" />
            </div>
            <div className="w-14 h-7 bg-gray-200 rounded-lg" />
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
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={onAddToCart}
        />
      ))}
    </div>
  );
}
