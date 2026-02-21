import { Link, useLocation } from 'react-router-dom';
import { HiChevronRight, HiHome } from 'react-icons/hi';

/**
 * Breadcrumb component.
 *
 * Usage:
 *   <Breadcrumb items={[
 *     { label: 'Produk', to: '/produk' },
 *     { label: 'Detail' },
 *   ]} />
 */
export default function Breadcrumb({ items = [], className = '' }) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-sm ${className}`}>
      <Link
        to="/"
        className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0"
        aria-label="Dashboard"
      >
        <HiHome className="w-4 h-4" />
      </Link>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="flex items-center">
            <HiChevronRight className="w-4 h-4 text-gray-300 mx-1.5 flex-shrink-0" />
            {isLast || !item.to ? (
              <span className="text-gray-700 font-medium truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.to}
                className="text-gray-400 hover:text-blue-600 transition-colors truncate max-w-[200px]"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
