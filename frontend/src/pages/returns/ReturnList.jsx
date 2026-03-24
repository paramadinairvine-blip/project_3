import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HiEye } from 'react-icons/hi';
import { returnAPI } from '../../api/endpoints';
import { Card, Table, Loading, Pagination, SearchBar, CalendarPicker } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggalWaktu } from '../../utils/formatDate';

export default function ReturnList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState(null);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['returns', page, search, filterDate],
    queryFn: async () => {
      const params = { page, limit };
      if (search) params.search = search;
      if (filterDate) {
        const [y, m, d] = filterDate.split('-').map(Number);
        params.startDate = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
        params.endDate = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
      }
      const { data: res } = await returnAPI.getAll(params);
      return res;
    },
  });

  const columns = [
    {
      key: 'createdAt',
      header: 'Tanggal',
      render: (v) => <span className="text-sm">{formatTanggalWaktu(v)}</span>,
    },
    {
      key: 'returnNumber',
      header: 'No. Retur',
      render: (v) => <span className="font-mono font-medium text-sm">{v}</span>,
    },
    {
      key: 'transaction',
      header: 'No. Transaksi',
      render: (_, row) => (
        <span className="font-mono text-sm text-blue-600 cursor-pointer hover:underline"
          onClick={(e) => { e.stopPropagation(); navigate(`/transaksi/${row.transaction?.id}`); }}>
          {row.transaction?.transactionNumber || '-'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Jumlah Item',
      render: (v) => <span className="text-sm">{v?.length || 0} item</span>,
    },
    {
      key: 'refundAmount',
      header: 'Refund',
      render: (v) => <span className="font-medium text-red-600 text-sm">{formatRupiah(v)}</span>,
    },
    {
      key: 'creator',
      header: 'Dibuat Oleh',
      render: (v) => <span className="text-sm">{v?.fullName || '-'}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/retur/${row.id}`); }}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Lihat Detail"
        >
          <HiEye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  if (isLoading) return <Loading text="Memuat data retur..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Retur Transaksi</h1>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchBar
            value={search}
            onChange={(val) => { setSearch(val); setPage(1); }}
            placeholder="Cari nomor retur atau transaksi..."
            className="flex-1"
          />
          <CalendarPicker
            mode="single"
            dateFrom={filterDate}
            onChange={(date) => { setFilterDate(date); setPage(1); }}
          />
        </div>
        <Table
          columns={columns}
          data={data?.data || []}
          onRowClick={(row) => navigate(`/retur/${row.id}`)}
          emptyMessage="Belum ada data retur"
        />
        {data?.pagination && (
          <Pagination
            currentPage={page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
