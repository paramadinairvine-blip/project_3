import { useState, useRef, useEffect } from 'react';
import { HiSearch, HiCamera } from 'react-icons/hi';

export default function ProductSearch({ onSearch, onScanClick, autoFocus = true }) {
  const [nameValue, setNameValue] = useState('');
  const [barcodeValue, setBarcodeValue] = useState('');
  const nameRef = useRef(null);
  const barcodeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (autoFocus && nameRef.current) {
      nameRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        nameRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        barcodeRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoFocus]);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setNameValue(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(val);
    }, 300);
  };

  const handleBarcodeChange = (e) => {
    const val = e.target.value;
    setBarcodeValue(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(val);
    }, 300);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(timerRef.current);
      onSearch(nameValue);
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(timerRef.current);
      onSearch(barcodeValue);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search by Name */}
      <div className="relative flex-1">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={nameRef}
          type="text"
          value={nameValue}
          onChange={handleNameChange}
          onKeyDown={handleNameKeyDown}
          placeholder="Cari Nama Product (F1)"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
        />
      </div>

      {/* Search by Barcode */}
      <div className="relative flex-1">
        <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={barcodeRef}
          type="text"
          value={barcodeValue}
          onChange={handleBarcodeChange}
          onKeyDown={handleBarcodeKeyDown}
          placeholder="Cari Barcode (F2)"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
        />
      </div>

      {/* Scan / Search button */}
      <button
        onClick={onScanClick}
        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold flex-shrink-0 tracking-wide"
      >
        <HiCamera className="w-4 h-4" />
        CARI
      </button>
    </div>
  );
}
