import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HiPlus, HiPencil, HiTrash, HiEye } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { supplierAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Table, Button, SearchBar, Pagination, Modal } from '../../components/common';
import useAuth from '../../hooks/useAuth';

export default function SupplierList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isOperator } = useAuth();
  const canEdit = isAdmin || isOperator;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { page, search }],
    queryFn: async () => {
      const { data: res } = await supplierAPI.getAll({ page, limit: 20, search: search || undefined });
      return res;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supplierAPI.remove(id),
    onSuccess: () => {
      toast.success('Supplier berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menghapus supplier')),
  });

  const suppliers = data?.data || [];
  const pagination = data?.pagination || {};

  const columns = [
    {
      key: 'name',
      header: 'Nama Supplier',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          {row.email && <p className="text-xs text-gray-500">{row.email}</p>}
        </div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Kontak',
      render: (v) => <span className="text-gray-600">{v || '-'}</span>,
    },
    {
      key: 'phone',
      header: 'Telepon',
      render: (v) => <span className="text-gray-600">{v || '-'}</span>,
    },
    {
      key: 'address',
      header: 'Alamat',
      render: (v) => (
        <span className="text-gray-600 text-sm line-clamp-2">{v || '-'}</span>
      ),
    },
    {
      key: '_count',
      header: 'Jumlah PO',
      render: (v) => (
        <span className="font-medium text-gray-900">{v?.purchaseOrders || 0}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      width: '130px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/purchase-order?supplier=${row.id}`); }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Riwayat PO"
            aria-label="Riwayat PO"
          >
            <HiEye className="w-4 h-4" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/supplier/${row.id}/edit`); }}
                className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                title="Edit"
                aria-label="Edit supplier"
              >
                <HiPencil className="w-4 h-4" />
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus"
                  aria-label="Hapus supplier"
                >
                  <HiTrash className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Supplier</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola data supplier dan riwayat pembelian</p>
        </div>
        {canEdit && (
          <Button icon={HiPlus} onClick={() => navigate('/supplier/tambah')}>
            Tambah Supplier
          </Button>
        )}
      </div>

      {/* Search */}
      <SearchBar
        placeholder="Cari nama supplier, kontak, atau telepon..."
        onSearch={(v) => { setSearch(v); setPage(1); }}
        className="max-w-md"
      />

      {/* Table */}
      <Table
        columns={columns}
        data={suppliers}
        loading={isLoading}
        sortable
        emptyMessage="Tidak ada supplier ditemukan"
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Delete modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Supplier"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget?.id)}
            >
              Hapus
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus supplier{' '}
          <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
        </p>
      </Modal>
    </div>
  );
}
