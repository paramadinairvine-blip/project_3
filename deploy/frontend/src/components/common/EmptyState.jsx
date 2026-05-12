/**
 * EmptyState with inline SVG illustration.
 *
 * Usage:
 *   <EmptyState
 *     title="Tidak ada data"
 *     description="Data yang Anda cari belum tersedia."
 *     action={<Button>Tambah Baru</Button>}
 *   />
 */
export default function EmptyState({
  title = 'Tidak ada data',
  description,
  action,
  icon,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {/* Illustration */}
      {icon || (
        <svg
          className="w-32 h-32 text-gray-200 mb-4"
          viewBox="0 0 128 128"
          fill="none"
          aria-hidden="true"
        >
          {/* Box */}
          <rect x="24" y="40" width="80" height="60" rx="6" stroke="currentColor" strokeWidth="3" />
          {/* Box flap left */}
          <path d="M24 40 L44 20 L64 40" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="none" />
          {/* Box flap right */}
          <path d="M104 40 L84 20 L64 40" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="none" />
          {/* Dashed line inside */}
          <line x1="44" y1="65" x2="84" y2="65" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 4" />
          <line x1="50" y1="78" x2="78" y2="78" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 4" />
          {/* Magnifier */}
          <circle cx="98" cy="30" r="12" stroke="currentColor" strokeWidth="3" />
          <line x1="107" y1="39" x2="116" y2="48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          {/* Question mark inside magnifier */}
          <text x="94" y="36" fontSize="16" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">?</text>
        </svg>
      )}

      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-sm mb-4">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
