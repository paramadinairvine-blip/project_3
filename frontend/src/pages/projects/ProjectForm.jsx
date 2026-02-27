import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiArrowLeft, HiPlus, HiTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { projectAPI, productAPI, unitAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Card, Button, Input, Select } from '../../components/common';
import { PROJECT_STATUS, PROJECT_STATUS_LABELS } from '../../utils/constants';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

const emptyMaterial = () => ({
  _key: Date.now() + Math.random(),
  productId: '',
  variantId: '',
  unitId: '',
  estimatedQty: '',
  notes: '',
  product: null,
});

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: PROJECT_STATUS.PLANNING,
    startDate: '',
    endDate: '',
    budget: '',
  });
  const [materials, setMaterials] = useState([emptyMaterial()]);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // ─── Fetch options ──────────────────────────────────
  const { data: products } = useQuery({
    queryKey: ['products-select'],
    queryFn: async () => {
      const { data } = await productAPI.getAll({ limit: 500 });
      return data.data || [];
    },
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const { data } = await unitAPI.getMeasures();
      return data.data || [];
    },
  });

  // ─── Load existing project ─────────────────────────
  const { data: existing } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await projectAPI.getById(id);
      return data.data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || '',
        description: existing.description || '',
        status: existing.status || PROJECT_STATUS.PLANNING,
        startDate: existing.startDate ? existing.startDate.slice(0, 10) : '',
        endDate: existing.endDate ? existing.endDate.slice(0, 10) : '',
        budget: existing.budget?.toString() || '',
      });
      if (existing.materials?.length > 0) {
        setMaterials(
          existing.materials.map((m) => ({
            _key: m.id || Date.now() + Math.random(),
            id: m.id,
            productId: m.productId || '',
            variantId: m.variantId || '',
            unitId: m.unitId || '',
            estimatedQty: m.estimatedQty?.toString() || '',
            notes: m.notes || '',
            product: m.product || null,
          }))
        );
      }
    }
  }, [existing]);

  // ─── Options ────────────────────────────────────────
  const statusOptions = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const productOptions = (products || []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.sku})`,
    product: p,
  }));

  const getProductById = (productId) =>
    (products || []).find((p) => p.id === productId) || null;

  const getVariantOptions = (productId) => {
    const product = getProductById(productId);
    if (!product?.variants?.length) return [];
    return product.variants.map((v) => ({ value: v.id, label: v.name }));
  };

  const getUnitOptions = (productId) => {
    const product = getProductById(productId);
    const opts = [];
    if (product?.unitOfMeasure) {
      opts.push({ value: product.unitOfMeasure.id, label: product.unitOfMeasure.name });
    } else if (product?.unitId) {
      const u = (units || []).find((un) => un.id === product.unitId);
      if (u) opts.push({ value: u.id, label: u.name });
    }
    if (product?.productUnits?.length > 0) {
      product.productUnits.forEach((pu) => {
        if (pu.unit && !opts.find((o) => o.value === pu.unit.id)) {
          opts.push({ value: pu.unit.id, label: `${pu.unit.name} (×${pu.conversionFactor})` });
        }
      });
    }
    if (opts.length === 0) {
      return (units || []).map((u) => ({ value: u.id, label: u.name }));
    }
    return opts;
  };

  // ─── Material helpers ──────────────────────────────
  const updateMaterial = (index, field, value) => {
    setMaterials((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'productId') {
        const product = getProductById(value);
        updated[index].product = product;
        updated[index].variantId = '';
        updated[index].unitId = product?.unitOfMeasure?.id || product?.unitId || '';
      }
      return updated;
    });
    setIsDirty(true);
  };

  const addMaterial = () => {
    setMaterials((prev) => [...prev, emptyMaterial()]);
    setIsDirty(true);
  };

  const removeMaterial = (index) => {
    if (materials.length <= 1) {
      setMaterials([emptyMaterial()]);
    } else {
      setMaterials((prev) => prev.filter((_, i) => i !== index));
    }
    setIsDirty(true);
  };

  // ─── Submit ─────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data) => {
      if (isEdit) return projectAPI.update(id, data);
      return projectAPI.create(data);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Proyek berhasil diperbarui' : 'Proyek berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/proyek');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyimpan proyek')),
  });

  useUnsavedChanges(isDirty && !mutation.isSuccess);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nama proyek wajib diisi';
    if (!form.startDate) errs.startDate = 'Tanggal mulai wajib diisi';
    if (!form.budget || parseFloat(form.budget) <= 0) errs.budget = 'Budget harus lebih dari 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const validMaterials = materials
      .filter((m) => m.productId)
      .map((m) => ({
        id: m.id || undefined,
        productId: m.productId,
        variantId: m.variantId || null,
        unitId: m.unitId || null,
        estimatedQty: parseFloat(m.estimatedQty) || 0,
        notes: m.notes?.trim() || null,
      }));

    mutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      budget: parseFloat(form.budget) || 0,
      materials: validMaterials,
    });
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    setIsDirty(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/proyek')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Kembali ke daftar proyek"
        >
          <HiArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Proyek' : 'Tambah Proyek'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'Perbarui informasi proyek' : 'Buat proyek baru untuk mengelola kebutuhan material'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <Card title="Informasi Proyek" padding="md" className="mb-6">
          <div className="space-y-4">
            <Input
              label="Nama Proyek *"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Masukkan nama proyek"
              error={errors.name}
              autoFocus
            />

            <Input
              label="Deskripsi"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Deskripsi proyek (opsional)"
              textarea
              rows={3}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Status"
                value={form.status}
                onChange={(val) => updateField('status', val)}
                options={statusOptions}
              />
              <Input
                label="Tanggal Mulai *"
                type="date"
                value={form.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
                error={errors.startDate}
              />
              <Input
                label="Tanggal Selesai (Estimasi)"
                type="date"
                value={form.endDate}
                onChange={(e) => updateField('endDate', e.target.value)}
              />
            </div>

            <Input
              label="Estimasi Budget (Rp) *"
              type="number"
              min="0"
              step="1000"
              value={form.budget}
              onChange={(e) => updateField('budget', e.target.value)}
              placeholder="0"
              error={errors.budget}
            />
          </div>
        </Card>

        {/* Materials */}
        <Card
          title="Material yang Dibutuhkan"
          padding="none"
          className="mb-6"
          headerAction={
            <Button variant="outline" size="sm" icon={HiPlus} onClick={addMaterial}>
              Tambah Material
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[200px]">Produk</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[130px]">Varian</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[110px]">Satuan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-28">Estimasi Qty</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[150px]">Catatan</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {materials.map((mat, idx) => (
                  <tr key={mat._key} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={mat.productId}
                        onChange={(val) => updateMaterial(idx, 'productId', val)}
                        options={productOptions}
                        placeholder="Pilih produk..."
                        searchable
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={mat.variantId}
                        onChange={(val) => updateMaterial(idx, 'variantId', val)}
                        options={getVariantOptions(mat.productId)}
                        placeholder="—"
                        disabled={!getVariantOptions(mat.productId).length}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={mat.unitId}
                        onChange={(val) => updateMaterial(idx, 'unitId', val)}
                        options={getUnitOptions(mat.productId)}
                        placeholder="Satuan"
                        disabled={!mat.productId}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={mat.estimatedQty}
                        onChange={(e) => updateMaterial(idx, 'estimatedQty', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={mat.notes}
                        onChange={(e) => updateMaterial(idx, 'notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Catatan..."
                      />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => removeMaterial(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label={`Hapus material baris ${idx + 1}`}
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {materials.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              Belum ada material. Klik "Tambah Material" untuk menambahkan.
            </div>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate('/proyek')}>
            Batal
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Simpan Perubahan' : 'Simpan Proyek'}
          </Button>
        </div>
      </form>
    </div>
  );
}
