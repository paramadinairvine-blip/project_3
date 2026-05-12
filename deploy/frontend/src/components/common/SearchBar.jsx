import { useState, useEffect, useRef } from 'react';
import { HiSearch, HiX } from 'react-icons/hi';

export default function SearchBar({
  value: controlledValue,
  onSearch,
  placeholder = 'Cari...',
  debounce = 300,
  className = '',
}) {
  const [value, setValue] = useState(controlledValue || '');
  const timerRef = useRef(null);
  const isFirstRender = useRef(true);

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue);
    }
  }, [controlledValue]);

  // Debounced search
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    timerRef.current = setTimeout(() => {
      onSearch?.(value);
    }, debounce);
    return () => clearTimeout(timerRef.current);
  }, [value, debounce]);

  const handleClear = () => {
    setValue('');
    onSearch?.('');
  };

  return (
    <div className={`relative ${className}`}>
      <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <HiX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
