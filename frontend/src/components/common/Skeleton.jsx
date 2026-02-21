/**
 * Skeleton loading placeholders.
 *
 * Variants:
 *   <Skeleton.Card />       — stat card skeleton
 *   <Skeleton.Table rows={5} cols={4} /> — table skeleton
 *   <Skeleton.Text lines={3} />  — text lines
 *   <Skeleton.Block className="h-64" /> — generic block
 */

function Pulse({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function Card({ count = 1 }) {
  return (
    <div className={`grid gap-4 ${count > 1 ? `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(count, 4)}` : ''}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-6">
          <Pulse className="h-3 w-24 mb-3" />
          <Pulse className="h-7 w-32 mb-2" />
          <Pulse className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function Table({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Pulse key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="px-4 py-3.5 flex gap-4 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Pulse
              key={colIdx}
              className={`h-3 flex-1 ${colIdx === 0 ? 'max-w-[180px]' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Text({ lines = 3 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Pulse
          key={i}
          className={`h-3 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

function Block({ className = 'h-48' }) {
  return <Pulse className={`w-full rounded-xl ${className}`} />;
}

const Skeleton = { Card, Table, Text, Block };
export default Skeleton;
