import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiPlus, HiPencil, HiTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { unitAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Button, Badge, Modal, Loading, Breadcrumb, Input } from '../../components/common';
import useAuth from '../../hooks/useAuth';

function UnitFormModal({ unit, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = !!unit;

  const [name, setName] = useState(unit?.name || '');
  const [abbreviation, setAbbreviation] = useState(unit?.abbreviation || '');
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? unitAPI.updateMeasure(unit.id, data) : unitAPI.createMeasure(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Satuan berhasil diperbarui' : 'Satuan berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['units-measures'] });
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyimpan satuan')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!name.trim()) errs.name = 'Nama satuan wajib diisi';
    if (!abbreviation.trim()) errs.abbreviation = 'Singkatan wajib diisi';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    mutation.mutate({ name: name.trim(), abbreviation: abbreviation.trim() });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit Satuan' : 'Tambah Satuan'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit}>
            {isEdit ? 'Simpan' : 'Tambah'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama Satuan"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: null })); }}
          error={errors.name}
          placeholder="Contoh: Kilogram"
          autoFocus
        />
        <Input
          label="Singkatan"
          value={abbreviation}
          onChange={(e) => { setAbbreviation(e.target.value); setErrors((p) => ({ ...p, abbreviation: null })); }}
          error={errors.abbreviation}
          placeholder="Contoh: kg"
        />
      </form>
    </Modal>
  );
}

export default function UnitList() {
  const queryClient = useQueryClient();
  const { isAdmin, isOperator } = useAuth();
  const canEdit = isAdmin || isOperator;

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: units, isLoading } = useQuery({
    queryKey: ['units-measures'],
    queryFn: async () => {
      const { data } = await unitAPI.getMeasures();
      return data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => unitAPI.deleteMeasure(id),
    onSuccess: () => {
      toast.success('Satuan berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['units-measures'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menghapus satuan')),
  });

  const handleAdd = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEdit = (unit) => {
    setEditTarget(unit);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  if (isLoading) return <Loading text="Memuat satuan..." />;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Setting' }, { label: 'Satuan' }]} className="mb-4" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Satuan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola satuan pengukuran yang digunakan di produk, PO, dan transaksi
          </p>
        </div>
        {canEdit && (
          <Button icon={HiPlus} onClick={handleAdd}>
            Tambah Satuan
          </Button>
        )}
      </div>

      {/* Unit Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {units?.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Satuan
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Singkatan
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {canEdit && (
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {units.map((unit) => (
                <tr key={unit.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{unit.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {unit.abbreviation}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {unit.isActive !== false ? (
                      <Badge variant="success" size="sm">Aktif</Badge>
                    ) : (
                      <Badge variant="danger" size="sm">Non-Aktif</Badge>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(unit)}
                          className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <HiPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(unit)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            Belum ada satuan. Klik tombol "Tambah Satuan" untuk memulai.
          </div>
        )}
      </div>

      {/* Form Modal */}
      {formOpen && (
        <UnitFormModal unit={editTarget} onClose={handleFormClose} />
      )}

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus Satuan"
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
          Apakah Anda yakin ingin menghapus satuan{' '}
          <span className="font-semibold text-gray-900">
            {deleteTarget?.name} ({deleteTarget?.abbreviation})
          </span>
          ? Satuan yang sudah digunakan pada produk akan dinonaktifkan.
        </p>
      </Modal>
    </div>
  );
}
