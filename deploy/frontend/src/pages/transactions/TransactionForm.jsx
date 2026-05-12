import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HiPlus, HiTrash, HiQrcode, HiArrowLeft } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { transactionAPI, productAPI, unitAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/handleError';
import { Card, Button, Input, Select, Breadcrumb } from '../../components/common';
import BarcodeScanner from '../../components/BarcodeScanner';
import { formatRupiah } from '../../utils/formatCurrency';
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from '../../utils/constants';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

const emptyItem = () => ({
  _key: Date.now() + Math.random(),
  productId: '',
  variantId: '',
  unitId: '',
  quantity: '',
  unitPrice: '',
  product: null,
});

export default function TransactionForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [type, setType] = useState(TRANSACTION_TYPES.CASH);
  const [unitLembagaId, setUnitLembagaId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [showScanner, setShowScanner] = useState(false);
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

  const { data: unitLembagaList } = useQuery({
    queryKey: ['unit-lembaga'],
    queryFn: async () => {
      const { data } = await unitAPI.getLembaga();
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

  // ─── Options ────────────────────────────────────────
  const typeOptions = Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  const lembagaOptions = (unitLembagaList || []).map((u) => ({
    value: u.id,
    label: u.name,
  }));

  const productOptions = (products || []).map((p) => ({
    value: p.id,
    label: `${p.name} (${p.sku}) — Stok: ${p.stock}`,
    product: p,
  }));

  // ─── Helpers ────────────────────────────────────────
  const getProductById = (productId) =>
    (products || []).find((p) => p.id === productId) || null;

  const getVariantOptions = (productId) => {
    const product = getProductById(productId);
    if (!product?.variants?.length) return [];
    return product.variants.map((v) => ({
      value: v.id,
      label: `${v.name} — Stok: ${v.stock}`,
    }));
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

  const getAvailableStock = (productId, variantId) => {
    if (variantId) {
      const product = getProductById(productId);
      const variant = product?.variants?.find((v) => v.id === variantId);
      return variant?.stock ?? null;
    }
    const product = getProductById(productId);
    return product?.stock ?? null;
  };

  const updateItem = (index, field, value) => {
    setIsDirty(true);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'productId') {
        const product = getProductById(value);
        updated[index].product = product;
        updated[index].variantId = '';
        updated[index].unitId = product?.unitOfMeasure?.id || product?.unitId || '';
        updated[index].unitPrice = product?.sellPrice?.toString() || '';
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

  // ─── Barcode scan handler ──────────────────────────
  const handleBarcodeScan = (barcodeValue) => {
    setShowScanner(false);
    const product = (products || []).find(
      (p) => p.barcode === barcodeValue || p.sku === barcodeValue
    );
    if (!product) {
      toast.error(`Produk dengan barcode "${barcodeValue}" tidak ditemukan`);
      return;
    }

    // Check if product already in items
    const existingIdx = items.findIndex((item) => item.productId === product.id && !item.variantId);
    if (existingIdx >= 0) {
      // Increment quantity
      setItems((prev) => {
        const updated = [...prev];
        const currentQty = parseFloat(updated[existingIdx].quantity) || 0;
        updated[existingIdx] = { ...updated[existingIdx], quantity: (currentQty + 1).toString() };
        return updated;
      });
      toast.success(`${product.name} — jumlah ditambah`);
    } else {
      // Add new item or fill empty row
      const emptyIdx = items.findIndex((item) => !item.productId);
      if (emptyIdx >= 0) {
        updateItem(emptyIdx, 'productId', product.id);
        setItems((prev) => {
          const updated = [...prev];
          updated[emptyIdx] = {
            ...updated[emptyIdx],
            productId: product.id,
            product,
            unitId: product.unitOfMeasure?.id || product.unitId || '',
            unitPrice: product.sellPrice?.toString() || '',
            quantity: '1',
          };
          return updated;
        });
      } else {
        setItems((prev) => [
          ...prev,
          {
            _key: Date.now() + Math.random(),
            productId: product.id,
            variantId: '',
            unitId: product.unitOfMeasure?.id || product.unitId || '',
            quantity: '1',
            unitPrice: product.sellPrice?.toString() || '',
            product,
          },
        ]);
      }
      toast.success(`${product.name} ditambahkan`);
    }
  };

  // ─── Submit ─────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (data) => transactionAPI.create(data),
    onSuccess: (res) => {
      toast.success('Transaksi berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      navigate(`/transaksi/${res.data.data.id}`);
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal membuat transaksi')),
  });

  useUnsavedChanges(isDirty && !mutation.isSuccess);

  const validate = () => {
    const errs = {};
    if (!type) errs.type = 'Tipe transaksi wajib dipilih';
    const validItems = items.filter((item) => item.productId);
    if (validItems.length === 0) errs.items = 'Minimal 1 item produk';

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      const qty = parseFloat(item.quantity) || 0;
      if (qty <= 0) {
        errs.items = `Jumlah item ke-${i + 1} harus lebih dari 0`;
        break;
      }
      const availStock = getAvailableStock(item.productId, item.variantId);
      if (availStock !== null && qty > availStock) {
        errs.items = `Jumlah item ke-${i + 1} (${qty}) melebihi stok tersedia (${availStock})`;
        break;
      }
      if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) {
        errs.items = `Harga item ke-${i + 1} harus lebih dari 0`;
        break;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      type,
      unitLembagaId: unitLembagaId || null,
      notes: notes.trim() || null,
      items: items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: item.productId,
          variantId: item.variantId || null,
          unitId: item.unitId || null,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
        })),
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Breadcrumb items={[{ label: 'Transaksi', to: '/transaksi' }, { label: 'Transaksi Baru' }]} className="mb-4" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" icon={HiArrowLeft} onClick={() => navigate('/transaksi')}>Kembali</Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buat Transaksi</h1>
          <p className="text-sm text-gray-500 mt-1">Catat pengeluaran barang dari gudang</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Info */}
        <Card title="Informasi Transaksi" padding="md" className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Tipe Transaksi *"
              value={type}
              onChange={(v) => { setType(v); setIsDirty(true); }}
              options={typeOptions}
              placeholder="Pilih tipe..."
              error={errors.type}
              autoFocus
            />
            <Select
              label="Unit Lembaga"
              value={unitLembagaId}
              onChange={(v) => { setUnitLembagaId(v); setIsDirty(true); }}
              options={lembagaOptions}
              placeholder="Pilih unit lembaga..."
              searchable
            />
          </div>
          <div className="mt-4">
            <Input
              label="Catatan"
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setIsDirty(true); }}
              placeholder="Catatan transaksi (opsional)"
              textarea
              rows={2}
            />
          </div>
        </Card>

        {/* Items */}
        <Card
          title="Item Barang"
          padding="none"
          className="mb-6"
          headerAction={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" icon={HiQrcode} onClick={() => setShowScanner(true)}>
                Scan Barcode
              </Button>
              <Button variant="outline" size="sm" icon={HiPlus} onClick={addItem}>
                Tambah Item
              </Button>
            </div>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[220px]">Produk</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[130px]">Varian</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 min-w-[110px]">Satuan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-20">Stok</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-24">Jumlah</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 w-36">Harga</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 w-36">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => {
                  const availStock = getAvailableStock(item.productId, item.variantId);
                  const qty = parseFloat(item.quantity) || 0;
                  const overStock = availStock !== null && qty > availStock;

                  return (
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
                        {item.productId && availStock !== null && (
                          <span className={`text-sm font-medium ${overStock ? 'text-red-600' : 'text-green-600'}`}>
                            {availStock}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
                            overStock ? 'border-red-400 bg-red-50' : 'border-gray-300'
                          }`}
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={7} className="px-4 py-3 text-right font-semibold text-gray-700">
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
          <Button variant="outline" type="button" onClick={() => navigate('/transaksi')}>
            Batal
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Simpan Transaksi
          </Button>
        </div>
      </form>

      {/* Barcode Scanner */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
