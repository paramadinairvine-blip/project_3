import { useState, useEffect } from 'react';
import { HiX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { getPrinterSettings, savePrinterSettings, testPrinterConnection } from '../utils/printerService';

export default function PrinterSettingModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    cetakStruk: true,
    appKey: '',
    socketPort: 1811,
  });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getPrinterSettings());
    }
  }, [isOpen]);

  const handleSave = () => {
    savePrinterSettings(settings);
    toast.success('Pengaturan printer disimpan', { duration: 2000 });
    onClose();
  };

  const handleTest = async () => {
    setTesting(true);
    const result = await testPrinterConnection(settings);
    setTesting(false);

    if (result.connected) {
      toast.success(result.message, { duration: 3000 });
    } else {
      toast.error(result.message, { duration: 3000 });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Setting Printer</h2>
            <p className="text-xs text-gray-500 mt-0.5">Recta Host - Direct Thermal Printing</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Cetak Struk */}
          <div>
            <label className="block text-sm font-medium text-indigo-600 mb-2">Cetak Struk</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cetakStruk"
                  checked={settings.cetakStruk === true}
                  onChange={() => setSettings({ ...settings, cetakStruk: true })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Ya</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cetakStruk"
                  checked={settings.cetakStruk === false}
                  onChange={() => setSettings({ ...settings, cetakStruk: false })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Tidak</span>
              </label>
            </div>
          </div>

          {/* Recta Host Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              Pastikan <strong>Recta Host</strong> sudah diinstall dan berjalan di komputer ini.
              Download di <span className="underline">github.com/adenvt/recta-host</span>
            </p>
          </div>

          {/* Printer APP Key */}
          <div>
            <label className="block text-sm font-medium text-indigo-600 mb-2">Recta APP Key</label>
            <input
              type="text"
              value={settings.appKey}
              onChange={(e) => setSettings({ ...settings, appKey: e.target.value })}
              placeholder="Masukan APP Key dari Recta Host"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1">APP Key bisa dilihat di pengaturan Recta Host</p>
          </div>

          {/* Printer Socket Port */}
          <div>
            <label className="block text-sm font-medium text-indigo-600 mb-2">Port Recta Host</label>
            <input
              type="number"
              value={settings.socketPort}
              onChange={(e) => setSettings({ ...settings, socketPort: parseInt(e.target.value) || 1811 })}
              placeholder="1811"
              min="1"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Default: 1811</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Cetak'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
