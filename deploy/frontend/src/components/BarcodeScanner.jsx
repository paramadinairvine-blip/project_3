import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { HiCamera, HiX } from 'react-icons/hi';
import { Button } from './common';

export default function BarcodeScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  const startScanner = async () => {
    try {
      setError('');
      const html5QrCode = new Html5Qrcode('barcode-scanner');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {} // ignore scan failures
      );
      setIsScanning(true);
    } catch (err) {
      setError('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.');
      console.error('Scanner error:', err);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    } catch (err) {
      console.error('Stop scanner error:', err);
    }
  };

  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    stopScanner();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <HiCamera className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Scan Barcode</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scanner area */}
        <div className="p-4">
          <div
            id="barcode-scanner"
            ref={scannerRef}
            className="w-full rounded-lg overflow-hidden bg-gray-900"
            style={{ minHeight: '250px' }}
          />

          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}

          <p className="mt-3 text-xs text-gray-500 text-center">
            Arahkan kamera ke barcode produk
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
