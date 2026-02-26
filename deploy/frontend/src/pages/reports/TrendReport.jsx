import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { HiPrinter, HiDocumentDownload, HiTable } from 'react-icons/hi';
import { reportAPI } from '../../api/endpoints';
import { Card, Button, Input, Loading, Breadcrumb, Skeleton } from '../../components/common';
import TrendChart from '../../components/charts/TrendChart';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggal } from '../../utils/formatDate';
import { exportTableToPDF } from '../../utils/exportPDF';
import { exportToExcel } from '../../utils/exportExcel';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const BAR_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8'];

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-sm font-medium" style={{ color: d.payload.fill }}>{d.name}</p>
      <p className="text-sm">{formatRupiah(d.value)}</p>
    </div>
  );
};

const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-sm text-blue-600">{payload[0].value} unit</p>
    </div>
  );
};

export default function TrendReport() {
  const printRef = useRef();
  const chartsRef = useRef();

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(sixMonthsAgo);
  const [endDate, setEndDate] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['report-trend', { startDate, endDate }],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data: res } = await reportAPI.getTrend(params);
      return res.data;
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Laporan-Tren',
  });

  const monthlyTrend = data?.monthlyTrend || [];
  const topProducts = data?.topProducts || [];
  const perUnit = data?.perUnit || [];
  const comparison = data?.comparison || [];

  const periodLabel = `${formatTanggal(startDate)} — ${formatTanggal(endDate)}`;

  // ─── Exports ────────────────────────────────────────
  const handleExportPDF = () => {
    const headers = ['Bulan', 'Jumlah Transaksi', 'Total Pengeluaran (Rp)'];
    const rows = monthlyTrend.map((r) => [r.label || r.month, r.count || 0, r.total || 0]);
    exportTableToPDF('Laporan Tren Pengeluaran', headers, rows, 'laporan-tren.pdf', {
      subtitle: `Periode: ${periodLabel}`,
      columnStyles: ['left', 'right', 'right'],
    });
  };

  const handleExportExcel = () => {
    // Multiple sections in one sheet
    const headers = ['Bulan', 'Jumlah Transaksi', 'Total Pengeluaran (Rp)'];
    const rows = monthlyTrend.map((r) => [r.label || r.month, r.count || 0, r.total || 0]);

    // Add top products section
    const topHeaders = ['Produk', 'Total Qty', 'Total Nilai (Rp)'];
    const topRows = topProducts.map((r) => [r.name || r.productName, r.totalQty || r.quantity || 0, r.totalValue || 0]);

    // Combine
    const allRows = [
      ...rows,
      [], [],
      ['Top 10 Produk'],
      topHeaders,
      ...topRows,
    ];

    exportToExcel('Laporan Tren', headers, allRows, 'laporan-tren.xlsx');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Laporan' }, { label: 'Tren' }]} className="mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Tren</h1>
          <p className="text-sm text-gray-500 mt-1">Analisis tren pengeluaran material</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon={HiPrinter} onClick={handlePrint}>Cetak</Button>
          <Button variant="outline" size="sm" icon={HiDocumentDownload} onClick={handleExportPDF}>PDF</Button>
          <Button variant="outline" size="sm" icon={HiTable} onClick={handleExportExcel}>Excel</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <Input
          label="Tanggal Mulai"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-44"
        />
        <Input
          label="Tanggal Selesai"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-44"
        />
      </div>

      {isLoading ? (
        <>
          <Skeleton.Card count={1} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton.Card count={1} />
            <Skeleton.Card count={1} />
          </div>
          <Skeleton.Table rows={6} cols={4} />
        </>
      ) : (
        <div ref={chartsRef} className="space-y-6">
          {/* Row 1: Monthly Trend (Line/Area Chart) */}
          <Card title="Tren Pengeluaran per Bulan" padding="sm">
            <div className="pt-2">
              <TrendChart
                data={monthlyTrend}
                dataKeys={[{ key: 'total', name: 'Total Pengeluaran' }]}
                colors={['#3b82f6']}
              />
            </div>
          </Card>

          {/* Row 2: Top Products (Bar) + Per-Unit distribution (Pie) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Top 10 Produk Paling Banyak Dikeluarkan" padding="sm">
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProducts.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11, fill: '#374151' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="totalQty" name="Qty" radius={[0, 4, 4, 0]} barSize={20}>
                      {topProducts.slice(0, 10).map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                  Belum ada data produk
                </div>
              )}
            </Card>

            <Card title="Distribusi Pengeluaran per Unit Lembaga" padding="sm">
              {perUnit.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={perUnit}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      paddingAngle={2}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ strokeWidth: 1 }}
                    >
                      {perUnit.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                  Belum ada data per unit
                </div>
              )}
            </Card>
          </div>

          {/* Row 3: Comparison Table */}
          {comparison.length > 0 && (
            <Card title="Perbandingan Penggunaan Material antar Periode" padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Produk</th>
                      {comparison[0]?.periods?.map((p, i) => (
                        <th key={i} className="text-center px-4 py-3 text-xs font-semibold text-gray-600">
                          {p.label}
                        </th>
                      ))}
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Perubahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {comparison.map((item, idx) => {
                      const periods = item.periods || [];
                      const last = periods[periods.length - 1]?.value || 0;
                      const prev = periods[periods.length - 2]?.value || 0;
                      const change = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0;

                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                          {periods.map((p, i) => (
                            <td key={i} className="text-center px-4 py-3 text-gray-700">{p.value}</td>
                          ))}
                          <td className="text-center px-4 py-3">
                            <span className={`font-semibold ${change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {change > 0 ? '+' : ''}{change}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Hidden print content */}
      <div className="hidden">
        <div ref={printRef} className="p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>TOKO MATERIAL PESANTREN</h2>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Laporan Tren Pengeluaran</h3>
            <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Periode: {periodLabel}</p>
          </div>

          <h4 style={{ marginBottom: '6px' }}>Tren Bulanan</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {['Bulan', 'Jumlah Transaksi', 'Total Pengeluaran'].map((h) => (
                  <th key={h} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyTrend.map((r, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{r.label || r.month}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{r.count || 0}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{formatRupiah(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ marginBottom: '6px' }}>Top 10 Produk</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {['No', 'Produk', 'Total Qty'].map((h) => (
                  <th key={h} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.slice(0, 10).map((r, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{i + 1}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{r.name || r.productName}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{r.totalQty || r.quantity || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {perUnit.length > 0 && (
            <>
              <h4 style={{ marginBottom: '6px' }}>Distribusi per Unit</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    {['Unit Lembaga', 'Total Pengeluaran'].map((h) => (
                      <th key={h} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perUnit.map((r, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{r.name}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{formatRupiah(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
