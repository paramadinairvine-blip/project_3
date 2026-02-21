import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import {
  HiCurrencyDollar, HiCash, HiCreditCard, HiOfficeBuilding,
  HiPrinter, HiDocumentDownload, HiTable,
} from 'react-icons/hi';
import { reportAPI } from '../../api/endpoints';
import { Card, Badge, Button, Input, Select, Loading, Table, Breadcrumb, Skeleton } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggal } from '../../utils/formatDate';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '../../utils/constants';
import { exportTableToPDF } from '../../utils/exportPDF';
import { exportToExcel } from '../../utils/exportExcel';

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
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (typeFilter) params.type = typeFilter;
      const { data: res } = await reportAPI.getFinancial(params);
      return res.data;
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Laporan-Keuangan',
  });

  const typeOptions = [
    { value: '', label: 'Semua Tipe' },
    ...Object.entries(TRANSACTION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })),
  ];

  const summary = data?.summary || {};
  const perUnit = data?.perUnit || [];
  const unpaidBon = data?.unpaidBon || [];

  // ─── Unit table columns ─────────────────────────────
  const unitColumns = [
    { key: 'name', header: 'Unit Lembaga', render: (_, row) => <span className="font-medium text-gray-900">{row.name || '-'}</span> },
    { key: 'cashTotal', header: 'Tunai', render: (v) => formatRupiah(v) },
    { key: 'bonTotal', header: 'Bon', render: (v) => formatRupiah(v) },
    { key: 'anggaranTotal', header: 'Anggaran', render: (v) => formatRupiah(v) },
    { key: 'grandTotal', header: 'Total', render: (v) => <span className="font-bold">{formatRupiah(v)}</span> },
  ];

  // ─── Bon columns ────────────────────────────────────
  const bonColumns = [
    { key: 'transactionNumber', header: 'No. Transaksi', render: (v) => <span className="font-mono text-sm">{v}</span> },
    { key: 'unitLembaga', header: 'Unit', render: (_, row) => row.unitLembaga?.name || '-' },
    { key: 'createdAt', header: 'Tanggal', render: (v) => formatTanggal(v) },
    { key: 'totalAmount', header: 'Jumlah', render: (v) => <span className="font-medium">{formatRupiah(v)}</span> },
  ];

  // ─── Exports ────────────────────────────────────────
  const periodLabel = `${formatTanggal(startDate)} — ${formatTanggal(endDate)}`;

  const handleExportPDF = () => {
    const headers = ['Unit Lembaga', 'Tunai (Rp)', 'Bon (Rp)', 'Anggaran (Rp)', 'Total (Rp)'];
    const rows = perUnit.map((r) => [r.name || '-', r.cashTotal || 0, r.bonTotal || 0, r.anggaranTotal || 0, r.grandTotal || 0]);
    exportTableToPDF('Laporan Keuangan', headers, rows, 'laporan-keuangan.pdf', {
      subtitle: `Periode: ${periodLabel}`,
      columnStyles: ['left', 'right', 'right', 'right', 'right'],
    });
  };

  const handleExportExcel = () => {
    const headers = ['Unit Lembaga', 'Tunai (Rp)', 'Bon (Rp)', 'Anggaran (Rp)', 'Total (Rp)'];
    const rows = perUnit.map((r) => [r.name || '-', r.cashTotal || 0, r.bonTotal || 0, r.anggaranTotal || 0, r.grandTotal || 0]);
    exportToExcel('Laporan Keuangan', headers, rows, 'laporan-keuangan.xlsx');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Laporan' }, { label: 'Keuangan' }]} className="mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan pengeluaran per periode</p>
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
          <Skeleton.Card count={4} />
          <Skeleton.Table rows={8} cols={5} />
          <Skeleton.Table rows={5} cols={4} />
        </>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Pembelian (PO)" value={formatRupiah(summary.totalPurchase)} icon={HiCurrencyDollar} color="blue" />
            <StatCard title="Pengeluaran Tunai" value={formatRupiah(summary.cashTotal)} icon={HiCash} color="green" />
            <StatCard title="Pengeluaran Bon" value={formatRupiah(summary.bonTotal)} icon={HiCreditCard} color="orange" />
            <StatCard title="Pengeluaran Anggaran" value={formatRupiah(summary.anggaranTotal)} icon={HiOfficeBuilding} color="purple" />
          </div>

          {/* Per-unit table */}
          <Card title="Pengeluaran per Unit Lembaga" padding="none">
            <Table columns={unitColumns} data={perUnit} emptyMessage="Tidak ada data pengeluaran" />
          </Card>

          {/* Unpaid Bon */}
          <Card title="Bon Belum Lunas" padding="none">
            <Table columns={bonColumns} data={unpaidBon} emptyMessage="Tidak ada bon tertunda" />
          </Card>
        </>
      )}

      {/* Hidden print content */}
      <div className="hidden">
        <div ref={printRef} className="p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>TOKO MATERIAL PESANTREN</h2>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Laporan Keuangan</h3>
            <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>Periode: {periodLabel}</p>
          </div>

          {/* Summary */}
          <table style={{ width: '100%', marginBottom: '16px', fontSize: '11px' }}>
            <tbody>
              <tr><td style={{ padding: '2px 0' }}><strong>Total Pembelian (PO):</strong> {formatRupiah(summary.totalPurchase)}</td></tr>
              <tr><td style={{ padding: '2px 0' }}><strong>Tunai:</strong> {formatRupiah(summary.cashTotal)} | <strong>Bon:</strong> {formatRupiah(summary.bonTotal)} | <strong>Anggaran:</strong> {formatRupiah(summary.anggaranTotal)}</td></tr>
            </tbody>
          </table>

          <h4 style={{ marginBottom: '8px' }}>Pengeluaran per Unit</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {['Unit', 'Tunai', 'Bon', 'Anggaran', 'Total'].map((h) => (
                  <th key={h} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: h === 'Unit' ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perUnit.map((r, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{r.name || '-'}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{formatRupiah(r.cashTotal)}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{formatRupiah(r.bonTotal)}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{formatRupiah(r.anggaranTotal)}</td>
                  <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold' }}>{formatRupiah(r.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {unpaidBon.length > 0 && (
            <>
              <h4 style={{ marginBottom: '8px' }}>Bon Belum Lunas</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    {['No. Transaksi', 'Unit', 'Tanggal', 'Jumlah'].map((h) => (
                      <th key={h} style={{ border: '1px solid #d1d5db', padding: '4px 6px', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {unpaidBon.map((r, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{r.transactionNumber}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{r.unitLembaga?.name || '-'}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px' }}>{formatTanggal(r.createdAt)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '3px 6px', textAlign: 'right' }}>{formatRupiah(r.totalAmount)}</td>
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
