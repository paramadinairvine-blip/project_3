import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiPlus, HiTrash, HiUpload, HiArrowLeft } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { productAPI, categoryAPI, supplierAPI, unitAPI } from '../../api/endpoints';
import { Button, Input, Select, Card, Breadcrumb } from '../../components/common';
import { getErrorMessage } from '../../utils/handleError';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── Form state ──────────────────────────────────────
  const [form, setForm] = useState({
    name: '', categoryId: '', brandId: '', supplierId: '', description: '',
    unit: 'pcs', unitId: '', buyPrice: '', sellPrice: '', stock: '0',
    minStock: '0', maxStock: '', image: '',
  });
  const [variants, setVariants] = useState([]);
  const [unitConversions, setUnitConversions] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // ─── Fetch options ───────────────────────────────────
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await categoryAPI.getAll(); return data.data; },
  });

  const { data: brands } = useQuery({
    queryKey: ['brands-select'],
    queryFn: async () => {
      // Brands come from product list options — use a simple fetch
      const { data } = await supplierAPI.getAll({ limit: 100 });
      return data.data;
    },
    enabled: false, // We'll use inline for now
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => { const { data } = await unitAPI.getMeasures(); return data.data; },
  });

  // ─── Load existing product ──────────────────────────
  const { data: existing } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { const { data } = await productAPI.getById(id); return data.data; },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || '',
        categoryId: existing.categoryId || '',
        brandId: existing.brandId || '',
        supplierId: existing.supplierId || '',
        description: existing.description || '',
        unit: existing.unit || 'pcs',
        unitId: existing.unitId || '',
        buyPrice: existing.buyPrice?.toString() || '',
        sellPrice: existing.sellPrice?.toString() || '',
        stock: existing.stock?.toString() || '0',
        minStock: existing.minStock?.toString() || '0',
        maxStock: existing.maxStock?.toString() || '',
        image: existing.image || '',
      });
      if (existing.image) setImagePreview(existing.image);
      if (existing.variants?.length) {
        setVariants(existing.variants.map((v) => ({
          id: v.id, name: v.name, sku: v.sku || '', barcode: v.barcode || '',
          buyPrice: v.buyPrice?.toString() || '', sellPrice: v.sellPrice?.toString() || '',
          stock: v.stock?.toString() || '0',
        })));
      }
      if (existing.productUnits?.length) {
        setUnitConversions(existing.productUnits.map((pu) => ({
          unitId: pu.unit?.id || pu.unitId, conversionFactor: pu.conversionFactor?.toString() || '1',
          isBaseUnit: pu.isBaseUnit || false,
        })));
      }
    }
  }, [existing]);

  // ─── Category options (tree) ─────────────────────────
  const categoryOptions = [];
  if (categories) {
    categories.forEach((cat) => {
      categoryOptions.push({ value: cat.id, label: cat.name });
      if (cat.children) {
        cat.children.forEach((sub) => {
          categoryOptions.push({ value: sub.id, label: `  └ ${sub.name}` });
          if (sub.children) {
            sub.children.forEach((subsub) => {
              categoryOptions.push({ value: subsub.id, label: `     └ ${subsub.name}` });
            });
          }
        });
      }
    });
  }

  const unitOptions = (units || []).map((u) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` }));

  // ─── Handlers ────────────────────────────────────────
  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, { name: '', sku: '', buyPrice: '', sellPrice: '', stock: '0' }]);
  };

  const updateVariant = (idx, field, value) => {
    setVariants((prev) => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };

  const removeVariant = (idx) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const addUnitConversion = () => {
    setUnitConversions((prev) => [...prev, { unitId: '', conversionFactor: '1', isBaseUnit: false }]);
  };

  const updateConversion = (idx, field, value) => {
    setUnitConversions((prev) => prev.map((u, i) => i === idx ? { ...u, [field]: value } : u));
  };

  const removeConversion = (idx) => {
    setUnitConversions((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Image upload ────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await productAPI.uploadImage(formData);
      updateForm('image', data.data.url);
      toast.success('Gambar berhasil diupload');
    } catch {
      toast.error('Gagal mengupload gambar');
      setImagePreview(null);
    }
  };

  // ─── Barcode ─────────────────────────────────────────
  const barcodeMutation = useMutation({
    mutationFn: () => productAPI.generateBarcode(id),
    onSuccess: (res) => {
      toast.success('Barcode berhasil di-generate');
      queryClient.invalidateQueries({ queryKey: ['product', id] });
    },
    onError: () => toast.error('Gagal generate barcode'),
  });

  // ─── Submit ──────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (isEdit) return productAPI.update(id, payload);
      return productAPI.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/produk');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyimpan produk')),
  });

  useUnsavedChanges(isDirty && !saveMutation.isSuccess);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Nama produk wajib diisi';
    if (!form.categoryId) errs.categoryId = 'Kategori wajib dipilih';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name,
      categoryId: form.categoryId,
      brandId: form.brandId || undefined,
      supplierId: form.supplierId || undefined,
      description: form.description || undefined,
      unit: form.unit,
      unitId: form.unitId || undefined,
      buyPrice: parseFloat(form.buyPrice) || 0,
      sellPrice: parseFloat(form.sellPrice) || 0,
      stock: parseInt(form.stock) || 0,
      minStock: parseInt(form.minStock) || 0,
      maxStock: form.maxStock ? parseInt(form.maxStock) : undefined,
      image: form.image || undefined,
    };

    if (variants.length > 0) {
      payload.variants = variants
        .filter((v) => v.name.trim())
        .map((v) => ({
          name: v.name, sku: v.sku || `${form.name}-${v.name}`.replace(/\s/g, '-').toUpperCase(),
          buyPrice: parseFloat(v.buyPrice) || 0, sellPrice: parseFloat(v.sellPrice) || 0,
          stock: parseInt(v.stock) || 0,
        }));
    }

    if (unitConversions.length > 0) {
      payload.units = unitConversions
        .filter((u) => u.unitId)
        .map((u) => ({
          unitId: u.unitId, conversionFactor: parseFloat(u.conversionFactor) || 1,
          isBaseUnit: u.isBaseUnit,
        }));
    }

    saveMutation.mutate(payload);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'Produk', to: '/produk' }, { label: isEdit ? 'Edit Produk' : 'Tambah Produk' }]} className="mb-4" />

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" icon={HiArrowLeft} onClick={() => navigate('/produk')}>Kembali</Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Produk' : 'Tambah Produk'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'Perbarui informasi produk' : 'Isi data produk baru'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card title="Informasi Dasar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nama Produk"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              error={errors.name}
              placeholder="Contoh: Semen Tiga Roda 50kg"
              className="md:col-span-2"
              autoFocus
            />
            <Select
              label="Kategori"
              options={categoryOptions}
              value={form.categoryId}
              onChange={(v) => updateForm('categoryId', v)}
              error={errors.categoryId}
              placeholder="Pilih kategori..."
              searchable
            />
            <Input
              label="Unit/Satuan"
              value={form.unit}
              onChange={(e) => updateForm('unit', e.target.value)}
              placeholder="pcs, kg, meter, dll"
            />
            <Select
              label="Satuan Dasar"
              options={unitOptions}
              value={form.unitId}
              onChange={(v) => updateForm('unitId', v)}
              placeholder="Pilih satuan..."
            />
            <Input
              label="Deskripsi"
              type="textarea"
              value={form.description}
              onChange={(e) => updateForm('description', e.target.value)}
              placeholder="Deskripsi produk (opsional)"
              className="md:col-span-2"
            />
          </div>
        </Card>

        {/* Pricing */}
        <Card title="Harga & Stok">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Harga Beli"
              type="number"
              value={form.buyPrice}
              onChange={(e) => updateForm('buyPrice', e.target.value)}
              placeholder="0"
              min="0"
            />
            <Input
              label="Harga Jual"
              type="number"
              value={form.sellPrice}
              onChange={(e) => updateForm('sellPrice', e.target.value)}
              placeholder="0"
              min="0"
            />
            <Input
              label="Stok Minimum"
              type="number"
              value={form.minStock}
              onChange={(e) => updateForm('minStock', e.target.value)}
              placeholder="0"
              min="0"
            />
            <Input
              label="Stok Maksimum"
              type="number"
              value={form.maxStock}
              onChange={(e) => updateForm('maxStock', e.target.value)}
              placeholder="Opsional"
              min="0"
            />
          </div>
        </Card>

        {/* Image upload */}
        <Card title="Foto Produk">
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-gray-400 text-center px-2">Belum ada foto</span>
              )}
            </div>
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                <HiUpload className="w-4 h-4" />
                Upload Gambar
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
              </label>
              <p className="text-xs text-gray-500 mt-2">Format: JPG, PNG, WebP. Maks 2MB.</p>
            </div>
          </div>
        </Card>

        {/* Variants */}
        <Card
          title="Varian Produk"
          subtitle="Opsional — tambahkan jika produk memiliki beberapa varian"
          headerAction={
            <Button variant="outline" size="sm" icon={HiPlus} onClick={addVariant}>
              Tambah Varian
            </Button>
          }
        >
          {variants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada varian</p>
          ) : (
            <div className="space-y-4">
              {variants.map((v, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Input
                      label="Nama Varian"
                      value={v.name}
                      onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                      placeholder="10mm, Merah, dll"
                    />
                    <Input
                      label="Harga Beli"
                      type="number"
                      value={v.buyPrice}
                      onChange={(e) => updateVariant(idx, 'buyPrice', e.target.value)}
                      placeholder="0"
                    />
                    <Input
                      label="Harga Jual"
                      type="number"
                      value={v.sellPrice}
                      onChange={(e) => updateVariant(idx, 'sellPrice', e.target.value)}
                      placeholder="0"
                    />
                    <Input
                      label="Stok"
                      type="number"
                      value={v.stock}
                      onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="mt-7 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Unit conversions */}
        <Card
          title="Konversi Satuan"
          subtitle="Opsional — tambahkan konversi antar satuan"
          headerAction={
            <Button variant="outline" size="sm" icon={HiPlus} onClick={addUnitConversion}>
              Tambah Satuan
            </Button>
          }
        >
          {unitConversions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada konversi satuan</p>
          ) : (
            <div className="space-y-3">
              {unitConversions.map((uc, idx) => (
                <div key={idx} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
                  <Select
                    label="Satuan"
                    options={unitOptions}
                    value={uc.unitId}
                    onChange={(v) => updateConversion(idx, 'unitId', v)}
                    placeholder="Pilih..."
                    className="flex-1"
                  />
                  <Input
                    label="Faktor Konversi"
                    type="number"
                    value={uc.conversionFactor}
                    onChange={(e) => updateConversion(idx, 'conversionFactor', e.target.value)}
                    placeholder="1"
                    className="w-32"
                  />
                  <label className="flex items-center gap-2 pb-2.5">
                    <input
                      type="checkbox"
                      checked={uc.isBaseUnit}
                      onChange={(e) => updateConversion(idx, 'isBaseUnit', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Dasar</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeConversion(idx)}
                    className="p-2 mb-0.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <HiTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Barcode (edit only) */}
        {isEdit && existing && (
          <Card title="Barcode">
            {existing.barcode ? (
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-lg">
                  {existing.barcode}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => barcodeMutation.mutate()}
                  loading={barcodeMutation.isPending}
                >
                  Generate Ulang
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">Belum ada barcode</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => barcodeMutation.mutate()}
                  loading={barcodeMutation.isPending}
                >
                  Generate Barcode
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={() => navigate('/produk')}>Batal</Button>
          <Button type="submit" loading={saveMutation.isPending}>
            {isEdit ? 'Simpan Perubahan' : 'Simpan Produk'}
          </Button>
        </div>
      </form>
    </div>
  );
}
