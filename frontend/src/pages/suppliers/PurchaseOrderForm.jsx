import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiPlus, HiTrash, HiArrowLeft } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { purchaseOrderAPI, supplierAPI, productAPI, unitAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Card, Button, Input, Select, Breadcrumb } from '../../components/common';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';
import { formatRupiah } from '../../utils/formatCurrency';

const emptyItem = () => ({
  _key: Date.now() + Math.random(),
  productId: '',
  variantId: '',
  unitId: '',
  quantity: '',
  unitPrice: '',
  product: null,   // cached product object
});

export default function PurchaseOrderForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // ─── Fetch options ──────────────────────────────────
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn: async () => {
      const { data } = await supplierAPI.getAll({ limit: 200 });
      return data.data || [];
    },
  });

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

  // ─── Load existing PO ──────────────────────────────
  const { data: existing } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data } = await purchaseOrderAPI.getById(id);
      return data.data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setSupplierId(existing.supplierId || '');
      setNotes(existing.notes || '');
      if (existing.items?.length > 0) {
        setItems(
          existing.items.map((item) => ({
            _key: item.id || Date.now() + Math.random(),
            productId: item.productId || '',
            variantId: item.variantId || '',
            unitId: item.unitId || '',
            quantity: item.quantity?.toString() || '',
            unitPrice: item.unitPrice?.toString() || '',
            product: item.product || null,
          }))
        );
      }
    }
  }, [existing]);

  // ─── Supplier options ──────────────────────────────
  const supplierOptions = (suppliers || []).map((s) => ({
    value: s.id,
    label: s.name,
  }));

  // ─── Product options ───────────────────────────────
  const productOptions = (products || []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.sku})`,
    product: p,
  }));

  // ─── Helpers ───────────────────────────────────────
  const getProductById = (productId) => {
    return (products || []).find((p) => p.id === productId) || null;
  };

  const getVariantOptions = (productId) => {
    const product = getProductById(productId);
    if (!product?.variants?.length) return [];
    return product.variants.map((v) => ({
      value: v.id,
      label: `${v.name} — ${v.sku}`,
    }));
  };

  const getUnitOptions = (productId) => {
    const product = getProductById(productId);
    const opts = [];
    // Base unit from product
    if (product?.unitOfMeasure) {
      opts.push({ value: product.unitOfMeasure.id, label: product.unitOfMeasure.name });
    } else if (product?.unitId) {
      const u = (units || []).find((un) => un.id === product.unitId);
      if (u) opts.push({ value: u.id, label: u.name });
    }
    // Additional units from productUnits
    if (product?.productUnits?.length > 0) {
      product.productUnits.forEach((pu) => {
        if (pu.unit && !opts.find((o) => o.value === pu.unit.id)) {
          opts.push({ value: pu.unit.id, label: `${pu.unit.name} (×${pu.conversionFactor})` });
        }
      });
    }
    // Fallback: all units
    if (opts.length === 0) {
      return (units || []).map((u) => ({ value: u.id, label: u.name }));
    }
    return opts;
  };

  const updateItem = (index, field, value) => {
    setIsDirty(true);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-fill when product changes
      if (field === 'productId') {
        const product = getProductById(value);
        updated[index].product = product;
        updated[index].variantId = '';
        updated[index].unitId = product?.unitOfMeasure?.id || product?.unitId || '';
        updated[index].unitPrice = product?.buyPrice?.toString() || '';
      }

      return updated;
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calcItemTotal = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return qty * price;
  };

  const grandTotal = items.reduce((sum, item) => sum + calcItemTotal(item), 0);

  // ─── Mutations ─────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isEdit) return purchaseOrderAPI.update(id, data);
      return purchaseOrderAPI.create(data);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'PO berhasil diperbarui' : 'PO berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      navigate('/purchase-order');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyimpan PO')),
  });

  const saveAndSendMutation = useMutation({
    mutationFn: async (data) => {
      let poId = id;
      if (isEdit) {
        await purchaseOrderAPI.update(id, data);
      } else {
        const res = await purchaseOrderAPI.create(data);
        poId = res.data.data.id;
      }
      await purchaseOrderAPI.send(poId);
      return poId;
    },
    onSuccess: () => {
      toast.success('PO berhasil disimpan dan dikirim ke supplier');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      navigate('/purchase-order');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyimpan & mengirim PO')),
  });

  const validate = () => {
    const errs = {};
    if (!supplierId) errs.supplierId = 'Supplier wajib dipilih';
    const validItems = items.filter((item) => item.productId);
    if (validItems.length === 0) errs.items = 'Minimal 1 item produk';
    for (let i = 0; i < validItems.length; i++) {
      if (!validItems[i].quantity || parseFloat(validItems[i].quantity) <= 0) {
        errs.items = `Jumlah item ke-${i + 1} harus lebih dari 0`;
        break;
      }
      if (!validItems[i].unitPrice || parseFloat(validItems[i].unitPrice) <= 0) {
        errs.items = `Harga satuan item ke-${i + 1} harus lebih dari 0`;
        break;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    supplierId,
    notes: notes.trim() || null,
    items: items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        unitId: item.unitId || null,
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.unitPrice),
      })),
  });

  const handleSaveDraft = (e) => {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate(buildPayload());
  };

  const handleSaveAndSend = () => {
    if (!validate()) return;
    saveAndSendMutation.mutate(buildPayload());
  };

  const isSubmitting = saveMutation.isPending || saveAndSendMutation.isPending;

  useUnsavedChanges(isDirty && !saveMutation.isSuccess && !saveAndSendMutation.isSuccess);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'Purchase Order', to: '/purchase-order' }, { label: isEdit ? 'Edit PO' : 'Buat PO' }]} className="mb-4" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/purchase-order')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Kembali"
        >
          <HiArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Purchase Order' : 'Buat Purchase Order'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit ? 'Perbarui data purchase order' : 'Buat pesanan baru ke supplier'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveDraft}>
        {/* Supplier */}
        <Card title="Informasi PO" padding="md" className="mb-6">
          <div className="space-y-4">
            <Select
              label="Supplier *"
              value={supplierId}
              onChange={(val) => { setSupplierId(val); setIsDirty(true); }}
              options={supplierOptions}
              placeholder="Pilih supplier..."
              searchable
              error={errors.supplierId}
              autoFocus
            />
            <Input
              label="Catatan"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }}
              placeholder="Catatan untuk PO ini (opsional)"
              textarea
              rows={2}
            />
          </div>
        </Card>

        {/* Items */}
        <Card
          title="Item Pesanan"
          padding="none"
          className="mb-6"
          headerAction={
            <Button variant="outline" size="sm" icon={HiPlus} onClick={addItem}>
              Tambah Item
            </Button>
          }
        >
          {errors.items && (
            <div className="px-4 pt-3">
              <p className="text-sm text-red-600">{errors.items}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[200px]">Produk</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[140px]">Varian</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[120px]">Satuan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-24">Jumlah</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-36">Harga Satuan</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 w-36">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={item._key} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={item.productId}
                        onChange={(val) => updateItem(idx, 'productId', val)}
                        options={productOptions}
                        placeholder="Pilih produk..."
                        searchable
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={item.variantId}
                        onChange={(val) => updateItem(idx, 'variantId', val)}
                        options={getVariantOptions(item.productId)}
                        placeholder="—"
                        disabled={!getVariantOptions(item.productId).length}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={item.unitId}
                        onChange={(val) => updateItem(idx, 'unitId', val)}
                        options={getUnitOptions(item.productId)}
                        placeholder="Satuan"
                        disabled={!item.productId}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatRupiah(calcItemTotal(item))}
                    </td>
                    <td className="px-2 py-3">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Hapus item"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={6} className="px-4 py-3 text-right font-semibold text-gray-700">
                    Total Keseluruhan
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-blue-600">
                    {formatRupiah(grandTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate('/purchase-order')}>
            Batal
          </Button>
          <Button type="submit" variant="outline" loading={saveMutation.isPending} disabled={isSubmitting}>
            Simpan Draft
          </Button>
          <Button type="button" onClick={handleSaveAndSend} loading={saveAndSendMutation.isPending} disabled={isSubmitting}>
            Simpan & Kirim
          </Button>
        </div>
      </form>
    </div>
  );
}
