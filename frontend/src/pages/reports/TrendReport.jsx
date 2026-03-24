import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { HiPrinter, HiDocumentDownload, HiTable } from 'react-icons/hi';
import { reportAPI } from '../../api/endpoints';
import { Card, Button, Loading, Skeleton, CalendarPicker } from '../../components/common';
import { formatRupiah, formatNumber } from '../../utils/formatCurrency';
import { formatTanggal } from '../../utils/formatDate';
import { exportTableToPDF } from '../../utils/exportPDF';
import { exportToExcel } from '../../utils/exportExcel';
import { STORE_INFO } from '../../utils/constants';

export default function TrendReport() {
  const printRef = useRef();

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

  const topProducts = data?.topProducts || [];
  const periodLabel = `${formatTanggal(startDate)} — ${formatTanggal(endDate)}`;

  // Total keseluruhan
  const totalQty = topProducts.reduce((s, p) => s + (p.totalQuantity || 0), 0);
  const totalValue = topProducts.reduce((s, p) => s + (p.totalValue || 0), 0);

  // ─── Exports ────────────────────────────────────────
  const handleExportPDF = () => {
    const headers = ['No', 'Produk', 'Jumlah', 'Total Nilai (Rp)'];
    const rows = topProducts.map((r, i) => [i + 1, r.product?.name || '-', r.totalQuantity || 0, formatNumber(r.totalValue || 0)]);
    exportTableToPDF('Laporan Tren Produk', headers, rows, 'laporan-tren.pdf', {
      subtitle: `Periode: ${periodLabel}`,
      columnStyles: ['center', 'left', 'right', 'right'],
    });
  };

  const handleExportExcel = () => {
    const headers = ['No', 'Produk', 'Jumlah', 'Total Nilai (Rp)'];
    const rows = topProducts.map((r, i) => [i + 1, r.product?.name || '-', r.totalQuantity || 0, formatNumber(r.totalValue || 0)]);
    exportToExcel('Laporan Tren', headers, rows, 'laporan-tren.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Tren</h1>
          <p className="text-sm text-gray-500 mt-1">Produk paling banyak dikeluarkan dalam periode</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon={HiPrinter} onClick={handlePrint}>Cetak</Button>
          <Button variant="outline" size="sm" icon={HiDocumentDownload} onClick={handleExportPDF}>PDF</Button>
          <Button variant="outline" size="sm" icon={HiTable} onClick={handleExportExcel}>Excel</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
          <CalendarPicker
            mode="range"
            dateFrom={startDate}
            dateTo={endDate}
            onChange={(from, to) => { setStartDate(from); setEndDate(to); }}
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton.Table rows={10} cols={4} />
      ) : (
        <Card title={`Produk Terlaris — ${periodLabel}`} padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-12">No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Produk</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-32">Jumlah</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase w-40">Total Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topProducts.length > 0 ? (
                  topProducts.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="text-center px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.product?.name || '-'}</p>
                        {item.product?.sku && <p className="text-xs text-gray-400">{item.product.sku}</p>}
                      </td>
                      <td className="text-right px-4 py-3 font-medium text-gray-900">
                        {item.totalQuantity || 0} <span className="text-xs text-gray-500">{item.product?.unit || 'pcs'}</span>
                      </td>
                      <td className="text-right px-4 py-3 font-medium text-gray-900">{formatRupiah(item.totalValue || 0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400">Belum ada data produk dalam periode ini</td>
                  </tr>
                )}
              </tbody>
              {topProducts.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 border-t border-blue-200">
                    <td colSpan={2} className="px-4 py-3 font-bold text-gray-700">TOTAL</td>
                    <td className="text-right px-4 py-3 font-bold text-gray-900">{totalQty}</td>
                    <td className="text-right px-4 py-3 font-bold text-blue-700">{formatRupiah(totalValue)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* Hidden print content */}
      <div className="hidden">
        <div ref={printRef} className="p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{STORE_INFO.NAME}</h2>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Laporan Tren Produk</h3>
            <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Periode: {periodLabel}</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {['No', 'Produk', 'Jumlah', 'Total Nilai'].map((h) => (
                  <th key={h} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts.map((r, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{r.product?.name || '-'}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{r.totalQuantity || 0}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{formatRupiah(r.totalValue || 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ border: '1px solid #d1d5db', padding: '4px 6px' }}>TOTAL</td>
                <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'right' }}>{totalQty}</td>
                <td style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'right' }}>{formatRupiah(totalValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
