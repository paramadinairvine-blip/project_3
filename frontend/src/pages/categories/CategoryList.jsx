import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiPlus, HiPencil, HiTrash, HiChevronDown, HiChevronRight } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { categoryAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Button, Badge, Modal, Loading } from '../../components/common';
import CategoryForm from './CategoryForm';
import useAuth from '../../hooks/useAuth';

function CategoryNode({ category, level = 0, onEdit, onDelete, onAddChild, canEdit }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children?.length > 0;

  return (
    <div>
      <div
        className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${
          level > 0 ? 'border-l-2 border-gray-200' : ''
        }`}
        style={{ paddingLeft: `${16 + level * 24}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
            >
              {expanded ? (
                <HiChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <HiChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <span className="font-medium text-gray-900 truncate">{category.name}</span>

          {category._count?.products > 0 && (
            <Badge variant="info" size="sm">
              {category._count.products} produk
            </Badge>
          )}

          {!category.isActive && (
            <Badge variant="danger" size="sm">Non-Aktif</Badge>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <button
              onClick={() => onAddChild(category)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Tambah Sub-Kategori"
              aria-label="Tambah sub-kategori"
            >
              <HiPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(category)}
              className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
              title="Edit"
              aria-label="Edit kategori"
            >
              <HiPencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(category)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Hapus"
              aria-label="Hapus kategori"
            >
              <HiTrash className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {hasChildren && expanded && (
        <div>
          {category.children.map((child) => (
            <CategoryNode
              key={child.id}
              category={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryList() {
  const queryClient = useQueryClient();
  const { isAdmin, isOperator } = useAuth();
  const canEdit = isAdmin || isOperator;

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [parentTarget, setParentTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await categoryAPI.getAll();
      return data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => categoryAPI.remove(id),
    onSuccess: () => {
      toast.success('Kategori berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menghapus kategori')),
  });

  const handleAdd = () => {
    setEditTarget(null);
    setParentTarget(null);
    setFormOpen(true);
  };

  const handleAddChild = (parent) => {
    setEditTarget(null);
    setParentTarget(parent);
    setFormOpen(true);
  };

  const handleEdit = (category) => {
    setEditTarget(category);
    setParentTarget(null);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditTarget(null);
    setParentTarget(null);
  };

  if (isLoading) return <Loading text="Memuat kategori..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola kategori dan sub-kategori produk</p>
        </div>
        {canEdit && (
          <Button icon={HiPlus} onClick={handleAdd}>
            Tambah Kategori
          </Button>
        )}
      </div>

      {/* Category Tree */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {categories?.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <CategoryNode
                key={cat.id}
                category={cat}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
                onAddChild={handleAddChild}
                canEdit={canEdit}
              />
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            Belum ada kategori. Klik tombol "Tambah Kategori" untuk memulai.
          </div>
        )}
      </div>

      {/* Form Modal */}
      {formOpen && (
        <CategoryForm
          category={editTarget}
          parentCategory={parentTarget}
          onClose={handleFormClose}
        />
      )}

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Kategori"
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
          Apakah Anda yakin ingin menghapus kategori{' '}
          <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
          {deleteTarget?.children?.length > 0 && (
            <span className="block mt-2 text-red-600">
              Kategori ini memiliki {deleteTarget.children.length} sub-kategori.
              Pastikan sub-kategori telah dipindahkan terlebih dahulu.
            </span>
          )}
        </p>
      </Modal>
    </div>
  );
}
