import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { brandAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Modal, Button, Input } from '../../components/common';

export default function BrandForm({ brand, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = !!brand;

  const [name, setName] = useState(brand?.name || '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEdit) return brandAPI.update(brand.id, data);
      return brandAPI.create(data);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Brand berhasil diperbarui' : 'Brand berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      onClose();
    },
    onError: (err) => {
      const msg = getErrorMessage(err, 'Gagal menyimpan brand');
      if (msg.toLowerCase().includes('sudah ada')) {
        setError('Nama brand sudah digunakan');
      }
      toast.error(msg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama brand wajib diisi');
      return;
    }
    if (name.trim().length < 2) {
      setError('Nama brand minimal 2 karakter');
      return;
    }
    setError('');
    mutation.mutate({ name: name.trim() });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit Brand' : 'Tambah Brand'}
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
          label="Nama Brand *"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          placeholder="Masukkan nama brand"
          error={error}
          autoFocus
        />
      </form>
    </Modal>
  );
}
