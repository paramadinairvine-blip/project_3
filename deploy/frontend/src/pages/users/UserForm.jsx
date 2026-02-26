import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { userAPI } from '../../api/endpoints';
import { getErrorMessage, getFieldErrors } from '../../utils/handleError';
import { Modal, Button, Input, Select } from '../../components/common';
import { ROLES, ROLE_LABELS } from '../../utils/constants';

export default function UserForm({ user, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = !!user;

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: ROLES.OPERATOR,
    phone: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        email: user.email || '',
        password: '',
        role: user.role || ROLES.OPERATOR,
        phone: user.phone || '',
      });
    }
  }, [user]);

  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEdit) return userAPI.update(user.id, data);
      return userAPI.create(data);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'User berhasil diperbarui' : 'User berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (err) => {
      const msg = getErrorMessage(err, 'Gagal menyimpan user');
      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('sudah')) {
        setErrors((prev) => ({ ...prev, email: 'Email sudah digunakan' }));
      }
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }
      toast.error(msg);
    },
  });

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Nama wajib diisi';
    if (!form.email.trim()) errs.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Format email tidak valid';
    if (!isEdit && (!form.password || form.password.length < 6)) errs.password = 'Password minimal 6 karakter';
    if (!form.role) errs.role = 'Role wajib dipilih';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      role: form.role,
      phone: form.phone.trim() || null,
    };

    if (!isEdit) {
      payload.password = form.password;
    }

    mutation.mutate(payload);
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Tambah User'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button loading={mutation.isPending} onClick={handleSubmit}>
            {isEdit ? 'Simpan' : 'Tambah User'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama Lengkap *"
          value={form.fullName}
          onChange={(e) => updateField('fullName', e.target.value)}
          placeholder="Masukkan nama lengkap"
          error={errors.fullName}
          autoFocus
        />

        <Input
          label="Email *"
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="email@pesantren.id"
          error={errors.email}
        />

        {!isEdit && (
          <Input
            label="Password *"
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="Minimal 6 karakter"
            error={errors.password}
          />
        )}

        <Select
          label="Role *"
          value={form.role}
          onChange={(val) => updateField('role', val)}
          options={roleOptions}
          error={errors.role}
        />

        <Input
          label="Telepon"
          value={form.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="08xxxxxxxxxx"
        />
      </form>
    </Modal>
  );
}
