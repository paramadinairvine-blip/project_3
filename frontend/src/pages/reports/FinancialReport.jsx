import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import {
  HiCurrencyDollar, HiCash, HiOfficeBuilding,
  HiPrinter, HiDocumentDownload, HiTable,
} from 'react-icons/hi';
import { reportAPI } from '../../api/endpoints';
import { Card, Badge, Button, Input, Select, Loading, Table, Skeleton, DateRangePicker } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggal } from '../../utils/formatDate';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS, TRANSACTION_TYPES } from '../../utils/constants';
import { exportTableToPDF } from '../../utils/exportPDF';
import { exportToExcel } from '../../utils/exportExcel';

// eslint-disable-next-line no-unused-vars
function StatCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600' },
    green: { bg: 'bg-green-50', icon: 'text-green-600' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </div>
  );
}

export default function FinancialReport() {
  const printRef = useRef();

  // Default: current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-financial', { startDate, endDate, type: typeFilter }],
    queryFn: async () => {
      const params = {};
      // Convert local WIB dates to UTC ISO for backend query
      // WIB = UTC+7, so start of day WIB = previous day 17:00 UTC
      if (startDate) {
        const s = new Date(startDate + 'T00:00:00+07:00');
        params.startDate = s.toISOString();
      }
      if (endDate) {
        const e = new Date(endDate + 'T23:59:59.999+07:00');
        params.endDate = e.toISOString();
      }
      if (typeFilter) params.type = typeFilter;
      const { data: res } = await reportAPI.getFinancial(params);
      const raw = res.data;

      // Support both old backend format and new format
      if (raw.summary) return raw;

      // Map old format → new format
      const byType = {};
      (raw.expenditureByType || []).forEach((e) => { byType[e.type] = e.total; });

      return {
        summary: {
          totalPurchase: raw.purchases?.totalAmount || 0,
          cashTotal: byType.CASH || 0,
          bonTotal: byType.BON || 0,
        },
        perUnit: (raw.expenditureByUnit || []).map((u) => ({
          name: u.unitLembagaName || '-',
          cashTotal: u.cashTotal || 0,
          bonTotal: u.bonTotal || 0,
          grandTotal: u.total || 0,
        })),
      };
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Laporan-Keuangan',
  });

  const typeOptions = [
    { value: '', label: 'Semua Tipe' },
    ...Object.entries(TRANSACTION_TYPE_LABELS)
      .map(([v, l]) => ({ value: v, label: l })),
  ];

  const summary = data?.summary || {};
  const perUnit = data?.perUnit || [];

  // ─── Unit table columns ─────────────────────────────
  const unitColumns = [
    { key: 'name', header: 'Akun', render: (_, row) => <span className="font-medium text-gray-900">{row.name || '-'}</span> },
    { key: 'cashTotal', header: 'Tunai', render: (v) => formatRupiah(v) },
    { key: 'bonTotal', header: 'Overbooking TU', render: (v) => formatRupiah(v) },
    { key: 'grandTotal', header: 'Total', render: (v) => <span className="font-bold">{formatRupiah(v)}</span> },
  ];

  // ─── Exports ────────────────────────────────────────
  const periodLabel = `${formatTanggal(startDate)} — ${formatTanggal(endDate)}`;

  const handleExportPDF = () => {
    const headers = ['Akun', 'Tunai (Rp)', 'Overbooking TU (Rp)', 'Total (Rp)'];
    const rows = perUnit.map((r) => [r.name || '-', r.cashTotal || 0, r.bonTotal || 0, r.grandTotal || 0]);
    exportTableToPDF('Laporan Keuangan', headers, rows, 'laporan-keuangan.pdf', {
      subtitle: `Periode: ${periodLabel}`,
      columnStyles: ['left', 'right', 'right', 'right'],
    });
  };

  const handleExportExcel = () => {
    const headers = ['Akun', 'Tunai (Rp)', 'Overbooking TU (Rp)', 'Total (Rp)'];
    const rows = perUnit.map((r) => [r.name || '-', r.cashTotal || 0, r.bonTotal || 0, r.grandTotal || 0]);
    exportToExcel('Laporan Keuangan', headers, rows, 'laporan-keuangan.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan pendapatan per periode</p>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
          <DateRangePicker
            dateFrom={startDate}
            dateTo={endDate}
            onChange={(from, to) => { setStartDate(from); setEndDate(to); }}
          />
        </div>
        <div className="w-48">
          <Select
            label="Tipe Transaksi"
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
          />
        </div>
      </div>

      {isLoading ? (
        <>
          <Skeleton.Card count={3} />
          <Skeleton.Table rows={8} cols={5} />
        </>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Pembelian (PO)" value={formatRupiah(summary.totalPurchase)} icon={HiCurrencyDollar} color="blue" />
            <StatCard title="Pendapatan Tunai" value={formatRupiah(summary.cashTotal)} icon={HiCash} color="green" />
            <StatCard title="Pendapatan Overbooking TU" value={formatRupiah(summary.bonTotal)} icon={HiOfficeBuilding} color="purple" />
            <StatCard title="Total" value={formatRupiah((summary.cashTotal || 0) + (summary.bonTotal || 0))} icon={HiCurrencyDollar} color="blue" />
          </div>

          {/* Per-unit table */}
          <Card title="Pendapatan Per-Akun" padding="none">
            <Table columns={unitColumns} data={perUnit} emptyMessage="Tidak ada data pendapatan" />
          </Card>

        </>
      )}

      {/* Hidden print content */}
      <div className="hidden">
        <div ref={printRef} className="p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>TOKO MATERIAL PESANTREN DARUNNAJAH 2</h2>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Laporan Keuangan</h3>
            <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Periode: {periodLabel}</p>
          </div>

          {/* Summary */}
          <table style={{ width: '100%', marginBottom: '16px', fontSize: '11px' }}>
            <tbody>
              <tr><td style={{ padding: '2px 0' }}><strong>Total Pembelian (PO):</strong> {formatRupiah(summary.totalPurchase)}</td></tr>
              <tr><td style={{ padding: '2px 0' }}><strong>Tunai:</strong> {formatRupiah(summary.cashTotal)} | <strong>Overbooking TU:</strong> {formatRupiah(summary.bonTotal)}</td></tr>
            </tbody>
          </table>

          <h4 style={{ marginBottom: '8px' }}>Pendapatan Per-Akun</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {['Akun', 'Tunai', 'Overbooking TU', 'Total'].map((h) => (
                  <th key={h} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: h === 'Akun' ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perUnit.map((r, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{r.name || '-'}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{formatRupiah(r.cashTotal)}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{formatRupiah(r.bonTotal)}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>{formatRupiah(r.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
}
