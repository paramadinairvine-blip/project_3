import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { brandAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Table, Badge, Button, SearchBar, Pagination, Modal, Breadcrumb } from '../../components/common';
import BrandForm from './BrandForm';
import useAuth from '../../hooks/useAuth';

export default function BrandList() {
  const queryClient = useQueryClient();
  const { isAdmin, isOperator } = useAuth();
  const canEdit = isAdmin || isOperator;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['brands', { page, search }],
    queryFn: async () => {
      const { data: res } = await brandAPI.getAll({
        page,
        limit: 20,
        search: search || undefined,
      });
      return res;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => brandAPI.remove(id),
    onSuccess: () => {
      toast.success('Brand berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menghapus brand')),
  });

  const brands = data?.data || [];
  const pagination = data?.pagination || {};

  const handleAdd = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEdit = (brand) => {
    setEditTarget(brand);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const columns = [
    {
      key: 'name',
      header: 'Nama Brand',
      sortable: true,
      render: (v) => <span className="font-medium text-gray-900">{v}</span>,
    },
    {
      key: '_count',
      header: 'Jumlah Produk',
      render: (v) => (
        <Badge variant="info" size="sm">
          {v?.products || 0} produk
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (v) => (
        <Badge variant={v ? 'success' : 'danger'} size="sm">
          {v ? 'Aktif' : 'Non-Aktif'}
        </Badge>
      ),
    },
  ];

  if (canEdit) {
    columns.push({
      key: 'actions',
      header: 'Aksi',
      width: '100px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
            title="Edit"
            aria-label="Edit brand"
          >
            <HiPencil className="w-4 h-4" />
          </button>
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Hapus"
              aria-label="Hapus brand"
            >
              <HiTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Produk', to: '/produk' }, { label: 'Brand' }]} className="mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola brand / merek produk</p>
        </div>
        {canEdit && (
          <Button icon={HiPlus} onClick={handleAdd}>
            Tambah Brand
          </Button>
        )}
      </div>

      {/* Search */}
      <SearchBar
        placeholder="Cari nama brand..."
        onSearch={(v) => { setSearch(v); setPage(1); }}
        className="max-w-md"
      />

      {/* Table */}
      <Table
        columns={columns}
        data={brands}
        loading={isLoading}
        sortable
        emptyMessage="Belum ada brand. Klik tombol 'Tambah Brand' untuk memulai."
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Form Modal */}
      {formOpen && (
        <BrandForm brand={editTarget} onClose={handleFormClose} />
      )}

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Brand"
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
          Apakah Anda yakin ingin menghapus brand{' '}
          <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
          {deleteTarget?._count?.products > 0 && (
            <span className="block mt-2 text-amber-600">
              Brand ini memiliki {deleteTarget._count.products} produk terkait dan akan dinonaktifkan saja.
            </span>
          )}
        </p>
      </Modal>
    </div>
  );
}
