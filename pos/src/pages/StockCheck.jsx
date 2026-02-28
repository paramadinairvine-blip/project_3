import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { HiSearch, HiCamera, HiCube } from 'react-icons/hi';
import { productAPI } from '../api/endpoints';
import { formatRupiah } from '../utils/formatCurrency';
import { Loading, EmptyState } from '../components/common';
import BarcodeScanner from '../components/BarcodeScanner';

export default function StockCheck() {
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['stock-products', search],
    queryFn: () => productAPI.getAll({ search, limit: 50, isActive: true }),
    select: (res) => res.data.data?.products || res.data.data || [],
    enabled: search.length > 0,
    staleTime: 15000,
  });

  const handleBarcodeScan = async (barcodeValue) => {
    setShowScanner(false);
    try {
      const { data: res } = await productAPI.getByBarcode(barcodeValue);
      if (res.data) {
        setSelectedProduct(res.data);
        setSearch(res.data.name);
      } else {
        toast.error('Produk tidak ditemukan');
      }
    } catch {
      toast.error('Produk dengan barcode tersebut tidak ditemukan');
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-gray-50">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Cek Stok Produk</h2>

        {/* Search bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedProduct(null);
              }}
              placeholder="Cari nama produk, SKU, atau barcode..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              autoFocus
            />
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <HiCamera className="w-5 h-5" />
            <span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        {/* Selected product detail */}
        {selectedProduct && (
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {selectedProduct.image ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}/uploads/${selectedProduct.image}`}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <HiCube className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-500">SKU: {selectedProduct.sku}</p>
                {selectedProduct.barcode && (
                  <p className="text-sm text-gray-500">Barcode: {selectedProduct.barcode}</p>
                )}
                <p className="text-sm text-gray-500">
                  Kategori: {selectedProduct.category?.name || '-'}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <p className="text-xs text-gray-500">Harga Jual</p>
                    <p className="text-sm font-bold text-blue-600">{formatRupiah(selectedProduct.sellPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Stok</p>
                    <p className={`text-lg font-bold ${
                      selectedProduct.stock <= 0
                        ? 'text-red-600'
                        : selectedProduct.stock <= (selectedProduct.minStock || 5)
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}>
                      {selectedProduct.stock} {selectedProduct.unitOfMeasure?.abbreviation || selectedProduct.unit || 'pcs'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Min. Stok</p>
                    <p className="text-sm font-medium text-gray-700">
                      {selectedProduct.minStock || 0} {selectedProduct.unitOfMeasure?.abbreviation || selectedProduct.unit || 'pcs'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search results */}
        {search && !selectedProduct && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {isLoading ? (
              <Loading text="Mencari produk..." className="py-6" />
            ) : !products || products.length === 0 ? (
              <EmptyState
                title="Produk tidak ditemukan"
                description="Coba kata kunci lain"
                className="py-6"
              />
            ) : (
              <div className="divide-y divide-gray-100">
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">{formatRupiah(product.sellPrice)}</p>
                      <p className={`text-xs font-medium ${
                        product.stock <= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        Stok: {product.stock} {product.unitOfMeasure?.abbreviation || product.unit || 'pcs'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!search && !selectedProduct && (
          <div className="text-center py-16">
            <HiCube className="w-16 h-16 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">Masukkan nama produk atau scan barcode untuk cek stok</p>
          </div>
        )}
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
