import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatRupiah } from '../../utils/formatCurrency';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
      <p className="text-sm font-medium text-gray-900 mb-1.5">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold">{formatRupiah(entry.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function TrendChart({ data = [], dataKeys = [], colors = [] }) {
  const defaultKeys = [{ key: 'total', name: 'Total' }];
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b'];
  const keys = dataKeys.length ? dataKeys : defaultKeys;
  const clrs = colors.length ? colors : defaultColors;

  const hasData = data.some((d) => keys.some((k) => d[k.key] > 0));

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Belum ada data tren
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {keys.map((k, i) => (
            <linearGradient key={k.key} id={`grad-${k.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={clrs[i % clrs.length]} stopOpacity={0.15} />
              <stop offset="95%" stopColor={clrs[i % clrs.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v}
        />
        <Tooltip content={<CustomTooltip />} />
        {keys.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
            iconSize={8}
          />
        )}
        {keys.map((k, i) => (
          <Area
            key={k.key}
            type="monotone"
            dataKey={k.key}
            name={k.name}
            stroke={clrs[i % clrs.length]}
            strokeWidth={2}
            fill={`url(#grad-${k.key})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
