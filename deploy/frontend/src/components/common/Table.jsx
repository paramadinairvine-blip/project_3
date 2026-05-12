import { useState } from 'react';
import { HiSortAscending, HiSortDescending } from 'react-icons/hi';
import Loading from './Loading';
import EmptyState from './EmptyState';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  sortable = false,
  onSort,
  sortBy,
  sortDir,
  emptyMessage = 'Tidak ada data',
  className = '',
  onRowClick,
}) {
  // Local sort state if not controlled
  const [localSortBy, setLocalSortBy] = useState(null);
  const [localSortDir, setLocalSortDir] = useState('asc');

  const activeSortBy = sortBy !== undefined ? sortBy : localSortBy;
  const activeSortDir = sortDir !== undefined ? sortDir : localSortDir;

  const handleSort = (col) => {
    if (!sortable || !col.sortable) return;
    const key = col.key || col.accessor;
    const newDir = activeSortBy === key && activeSortDir === 'asc' ? 'desc' : 'asc';

    if (onSort) {
      onSort(key, newDir);
    } else {
      setLocalSortBy(key);
      setLocalSortDir(newDir);
    }
  };

  // Apply local sorting if not controlled
  let displayData = [...data];
  if (sortable && localSortBy && !onSort) {
    displayData.sort((a, b) => {
      const aVal = a[localSortBy];
      const bVal = b[localSortBy];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        return localSortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return localSortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => {
                const key = col.key || col.accessor;
                const isSorted = activeSortBy === key;
                const canSort = sortable && col.sortable !== false;

                return (
                  <th
                    key={key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap ${
                      canSort ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                    } ${col.headerClassName || ''}`}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => canSort && handleSort(col)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header || col.title}
                      {canSort && isSorted && (
                        activeSortDir === 'asc'
                          ? <HiSortAscending className="w-4 h-4 text-blue-600" />
                          : <HiSortDescending className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12">
                  <Loading />
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-2">
                  <EmptyState title={emptyMessage} description="Coba ubah filter atau tambahkan data baru." />
                </td>
              </tr>
            ) : (
              displayData.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {columns.map((col) => {
                    const key = col.key || col.accessor;
                    const value = col.accessor ? row[col.accessor] : row[key];

                    return (
                      <td
                        key={key}
                        className={`px-4 py-3 text-gray-700 ${col.className || ''}`}
                      >
                        {col.render ? col.render(value, row, rowIdx) : (value ?? '-')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
