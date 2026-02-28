import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowLeft, HiPrinter, HiCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { Button } from '../components/common';

const PAPER_SIZES = [
  { value: '58mm', label: '58mm (Thermal Mini)' },
  { value: '80mm', label: '80mm (Thermal Standard)' },
  { value: 'A4', label: 'A4' },
];

const STORAGE_KEY = 'pos-printer-settings';

const defaultSettings = {
  printerName: '',
  paperSize: '80mm',
  autoPrint: false,
  showPreview: true,
  copies: 1,
};

export default function PrinterSetting() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast.success('Pengaturan printer disimpan', { duration: 2000 });
  };

  const handleTestPrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Test Print</title></head>
          <body style="font-family: monospace; padding: 20px; text-align: center;">
            <h3>Test Print</h3>
            <p>Toko Material - POS</p>
            <p>Pesantren Darunnajah 2</p>
            <hr/>
            <p>Paper: ${settings.paperSize}</p>
            <p>Printer berhasil terhubung!</p>
            <p style="font-size: 10px; color: #999;">${new Date().toLocaleString('id-ID')}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/kasir')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <HiArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <HiPrinter className="w-5 h-5 text-green-600" />
          <h1 className="text-lg font-semibold text-gray-900">Printer Setting</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Printer Name */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Printer</label>
            <input
              type="text"
              value={settings.printerName}
              onChange={(e) => setSettings({ ...settings, printerName: e.target.value })}
              placeholder="Contoh: EPSON TM-T82, Xprinter XP-58"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Paper Size */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ukuran Kertas</label>
            <select
              value={settings.paperSize}
              onChange={(e) => setSettings({ ...settings, paperSize: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              {PAPER_SIZES.map((size) => (
                <option key={size.value} value={size.value}>{size.label}</option>
              ))}
            </select>
          </div>

          {/* Copies */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah Cetak</label>
            <input
              type="number"
              min="1"
              max="5"
              value={settings.copies}
              onChange={(e) => setSettings({ ...settings, copies: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Toggle Options */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Auto Print</p>
                <p className="text-xs text-gray-500">Otomatis cetak setelah transaksi selesai</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, autoPrint: !settings.autoPrint })}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.autoPrint ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${settings.autoPrint ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Preview Struk</p>
                <p className="text-xs text-gray-500">Tampilkan preview sebelum mencetak</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, showPreview: !settings.showPreview })}
                className={`w-11 h-6 rounded-full transition-colors relative ${settings.showPreview ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${settings.showPreview ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button size="lg" className="flex-1" onClick={handleSave}>
              <HiCheck className="w-4 h-4 mr-2" />
              Simpan Pengaturan
            </Button>
            <button
              onClick={handleTestPrint}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <HiPrinter className="w-4 h-4" />
              Test Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
