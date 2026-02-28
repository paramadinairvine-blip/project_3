import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiShoppingCart } from 'react-icons/hi';
import { productAPI } from '../api/endpoints';
import useCartStore from '../stores/cartStore';
import ProductSearch from '../components/pos/ProductSearch';
import ProductGrid from '../components/pos/ProductGrid';
import Cart from '../components/pos/Cart';
import BarcodeScanner from '../components/BarcodeScanner';

export default function Cashier() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', searchQuery],
    queryFn: () => productAPI.getAll({ search: searchQuery, limit: 100, isActive: true }),
    select: (res) => {
      const d = res.data.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 30000,
  });

  const products = productsData || [];

  const handleAddToCart = (product) => {
    addItem(product);
    toast.success(`${product.name} ditambahkan`, { duration: 1500, position: 'bottom-center' });
  };

  const handleBarcodeScan = async (barcodeValue) => {
    setShowScanner(false);
    try {
      const { data: res } = await productAPI.getByBarcode(barcodeValue);
      const product = res.data;
      if (product) {
        handleAddToCart(product);
      } else {
        toast.error('Produk tidak ditemukan');
      }
    } catch {
      toast.error('Produk dengan barcode tersebut tidak ditemukan');
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Left: Product Search & Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 pb-3">
          <ProductSearch
            onSearch={setSearchQuery}
            onScanClick={() => setShowScanner(true)}
          />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <ProductGrid
            products={products}
            isLoading={isLoading}
            onAddToCart={handleAddToCart}
          />
        </div>
      </div>

      {/* Right: Cart (desktop) */}
      <div className="hidden lg:flex w-[380px] border-l border-gray-200 bg-gray-50 flex-col">
        <Cart />
      </div>

      {/* Mobile cart button */}
      <button
        onClick={() => setShowMobileCart(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
      >
        <HiShoppingCart className="w-6 h-6" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      {/* Mobile cart drawer */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileCart(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">Keranjang</h3>
              <button onClick={() => setShowMobileCart(false)} className="text-gray-500 hover:text-gray-700 text-lg">&times;</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Cart />
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
