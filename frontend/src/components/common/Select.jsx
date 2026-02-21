import { useState, useRef, useEffect, forwardRef } from 'react';
import { HiChevronDown, HiSearch, HiX } from 'react-icons/hi';

const Select = forwardRef(function Select(
  {
    label,
    options = [],
    value,
    onChange,
    placeholder = 'Pilih opsi...',
    error,
    disabled = false,
    searchable = false,
    className = '',
    id,
    name,
  },
  ref
) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputId = id || name || label?.toLowerCase().replace(/\s/g, '-');

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = searchable && search
    ? options.filter((o) =>
        (o.label || o.name || '').toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected ? (selected.label || selected.name) : '';

  const handleSelect = (opt) => {
    onChange?.(opt.value);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={ref}
          type="button"
          id={inputId}
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm text-left transition-colors outline-none disabled:bg-gray-50 disabled:cursor-not-allowed ${
            error
              ? 'border-red-300 focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
          }`}
        >
          <span className={displayLabel ? 'text-gray-900' : 'text-gray-400'}>
            {displayLabel || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600"
              >
                <HiX className="w-4 h-4" />
              </span>
            )}
            <HiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <div className="overflow-y-auto max-h-48">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">Tidak ada opsi</p>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 ${
                      opt.value === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {opt.label || opt.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default Select;
