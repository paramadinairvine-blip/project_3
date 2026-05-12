import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { categoryAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Modal, Button, Input, Select } from '../../components/common';

export default function CategoryForm({ category, parentCategory, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = !!category;

  const [form, setForm] = useState({
    name: '',
    parentId: '',
  });

  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await categoryAPI.getAll();
      return data.data;
    },
  });

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name || '',
        parentId: category.parentId || '',
      });
    } else if (parentCategory) {
      setForm((prev) => ({ ...prev, parentId: parentCategory.id }));
    }
  }, [category, parentCategory]);

  // Flatten category tree for parent select (exclude self and descendants when editing)
  const flattenCategories = (cats, level = 0, excludeId = null) => {
    const result = [];
    for (const cat of cats || []) {
      if (cat.id === excludeId) continue;
      result.push({
        value: cat.id,
        label: `${'— '.repeat(level)}${cat.name}`,
      });
      if (cat.children?.length > 0) {
        result.push(...flattenCategories(cat.children, level + 1, excludeId));
      }
    }
    return result;
  };

  const parentOptions = flattenCategories(allCategories, 0, category?.id);

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEdit) return categoryAPI.update(category.id, data);
      return categoryAPI.create(data);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyimpan kategori')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Nama kategori harus diisi');
      return;
    }
    mutation.mutate({
      name: form.name.trim(),
      parentId: form.parentId || null,
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit Kategori' : parentCategory ? 'Tambah Sub-Kategori' : 'Tambah Kategori'}
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
          label="Nama Kategori"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Masukkan nama kategori"
          required
          autoFocus
        />
        <Select
          label="Parent Kategori (Opsional)"
          value={form.parentId}
          onChange={(val) => setForm({ ...form, parentId: val })}
          options={parentOptions}
          placeholder="— Tanpa Parent (Kategori Utama) —"
          clearable
        />
      </form>
    </Modal>
  );
}
