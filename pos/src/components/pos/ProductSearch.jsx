import { useState, useRef, useEffect } from 'react';
import { HiSearch } from 'react-icons/hi';

export default function ProductSearch({ onSearch, autoFocus = true }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(val);
    }, 300);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(timerRef.current);
      onSearch(value);
    }
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Cari produk atau scan barcode..."
        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          &times;
        </button>
      )}
    </div>
  );
}
