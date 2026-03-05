import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HiPlus, HiEye } from 'react-icons/hi';
import { transactionAPI } from '../../api/endpoints';
import { Table, Badge, Button, SearchBar, Pagination } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { formatTanggalWaktu } from '../../utils/formatDate';
import {
  TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS,
  TRANSACTION_STATUS_LABELS, TRANSACTION_STATUS_COLORS,
} from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

export default function TransactionList() {
  const navigate = useNavigate();
  const { isAdmin, isOperator } = useAuth();
  const canCreate = isAdmin || isOperator;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', { page, search }],
    queryFn: async () => {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const { data: res } = await transactionAPI.getAll(params);
      return res;
    },
  });

  const transactions = data?.data || [];
  const pagination = data?.pagination || {};

  const columns = [
    {
      key: 'createdAt',
      header: 'Tanggal',
      sortable: true,
      render: (v) => <span className="text-gray-600">{formatTanggalWaktu(v)}</span>,
    },
    {
      key: 'type',
      header: 'Tipe',
      render: (v) => (
        <Badge colorClass={TRANSACTION_TYPE_COLORS[v]} size="sm">
          {TRANSACTION_TYPE_LABELS[v] || v}
        </Badge>
      ),
    },
    {
      key: 'creator',
      header: 'Kasir',
      render: (_, row) => (
        <span className="text-gray-600">{row.creator?.fullName || '-'}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (v) => <span className="text-gray-600">{v || '-'}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      sortable: true,
      render: (v) => <span className="font-medium text-gray-900">{formatRupiah(v)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <Badge colorClass={TRANSACTION_STATUS_COLORS[v]} size="sm">
          {TRANSACTION_STATUS_LABELS[v] || v}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      width: '60px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/transaksi/${row.id}`); }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Lihat Detail"
            aria-label="Lihat detail"
          >
            <HiEye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Transaksi</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola transaksi pengeluaran barang</p>
        </div>
        {canCreate && (
          <Button icon={HiPlus} onClick={() => navigate('/transaksi/tambah')}>
            Buat Transaksi
          </Button>
        )}
      </div>

      {/* Search */}
      <SearchBar
        placeholder="Cari nomor transaksi..."
        onSearch={(v) => { setSearch(v); setPage(1); }}
        className="max-w-md"
      />

      {/* Table */}
      <Table
        columns={columns}
        data={transactions}
        loading={isLoading}
        sortable
        onRowClick={(row) => navigate(`/transaksi/${row.id}`)}
        emptyMessage="Tidak ada transaksi ditemukan"
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
