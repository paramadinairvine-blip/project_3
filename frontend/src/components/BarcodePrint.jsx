import { useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import JsBarcode from 'jsbarcode';
import { HiPrinter, HiX } from 'react-icons/hi';
import { Button } from './common';

function BarcodeLabel({ product }) {
  const barcodeRef = useRef();

  useEffect(() => {
    if (barcodeRef.current && product.barcode) {
      try {
        JsBarcode(barcodeRef.current, product.barcode, {
          format: 'CODE128',
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 5,
        });
      } catch (err) {
        console.error('Barcode render error:', err);
      }
    }
  }, [product.barcode]);

  return (
    <div className="inline-block border border-gray-200 rounded p-3 text-center" style={{ width: '200px' }}>
      <svg ref={barcodeRef} />
      <p className="text-xs font-medium text-gray-900 mt-1 truncate">{product.name}</p>
      <p className="text-[10px] text-gray-500 font-mono">{product.sku}</p>
    </div>
  );
}

export default function BarcodePrint({ products = [], onClose }) {
  const printContentRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printContentRef,
    documentTitle: 'Barcode Labels',
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <HiPrinter className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Cetak Label Barcode</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-5">
          <div ref={printContentRef} className="flex flex-wrap gap-3 justify-center">
            {products.map((product, idx) => (
              <BarcodeLabel key={product.id || idx} product={product} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">{products.length} label</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Tutup</Button>
            <Button icon={HiPrinter} onClick={handlePrint}>Cetak</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
