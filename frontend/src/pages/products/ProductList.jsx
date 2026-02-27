import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HiPlus, HiPencil, HiTrash, HiEye } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { productAPI } from '../../api/endpoints';
import { Table, Button, SearchBar, Pagination, Modal, Skeleton } from '../../components/common';
import { formatRupiah } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/handleError';
import useAuth from '../../hooks/useAuth';

export default function ProductList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isOperator } = useAuth();
  const canEdit = isAdmin || isOperator;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, search }],
    queryFn: async () => {
      const { data: res } = await productAPI.getAll({ page, limit: 20, search: search || undefined });
      return res;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => productAPI.remove(id),
    onSuccess: () => {
      toast.success('Produk berhasil dinonaktifkan');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menghapus produk')),
  });

  const products = data?.data || [];
  const pagination = data?.pagination || {};

  const columns = [
    {
      key: 'image',
      header: 'Foto',
      width: '60px',
      render: (_, row) => (
        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
          {row.image ? (
            <img src={row.image} alt={row.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              N/A
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Nama Produk',
      sortable: true,
      render: (_, row) => (
        <p className="font-medium text-gray-900">{row.name}</p>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      render: (_, row) => (
        <span className="text-gray-600">{row.category?.name || '-'}</span>
      ),
    },
    {
      key: 'barcode',
      header: 'Barcode',
      render: (_, row) => (
        <span className="font-mono text-sm text-gray-700">{row.barcode || '-'}</span>
      ),
    },
    {
      key: 'sellPrice',
      header: 'Harga Jual',
      sortable: true,
      render: (_, row) => (
        <span className="text-gray-900">{formatRupiah(row.sellPrice)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      width: '120px',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/produk/${row.id}`); }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Lihat Detail"
            aria-label="Lihat detail"
          >
            <HiEye className="w-4 h-4" />
          </button>
          {canEdit && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/produk/${row.id}/edit`); }}
                className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                title="Edit"
                aria-label="Edit produk"
              >
                <HiPencil className="w-4 h-4" />
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Hapus"
                  aria-label="Hapus produk"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Produk</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola produk dan inventori</p>
        </div>
        {canEdit && (
          <Button icon={HiPlus} onClick={() => navigate('/produk/tambah')}>
            Tambah Produk
          </Button>
        )}
      </div>

      <SearchBar
        placeholder="Cari nama atau barcode produk..."
        onSearch={(v) => { setSearch(v); setPage(1); }}
        className="max-w-md"
      />

      <Table
        columns={columns}
        data={products}
        loading={isLoading}
        sortable
        onRowClick={(row) => navigate(`/produk/${row.id}`)}
        emptyMessage="Tidak ada produk ditemukan"
      />

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page || page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
        />
      )}

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Produk"
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
          Apakah Anda yakin ingin menonaktifkan produk{' '}
          <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
          Produk tidak akan dihapus permanen.
        </p>
      </Modal>
    </div>
  );
}
