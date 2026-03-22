import { useState } from 'react';
import { HiX, HiCheck } from 'react-icons/hi';
import { formatRupiah } from '../../utils/formatCurrency';

export default function UnitPickerModal({ product, onSelect, onClose }) {
  const baseUnit = {
    id: product.unitId || null,
    name: product.unitOfMeasure?.name || product.unit || 'pcs',
    abbreviation: product.unitOfMeasure?.abbreviation || product.unit || 'pcs',
    conversionFactor: 1,
    isBase: true,
    price: parseFloat(product.sellPrice) || 0,
  };

  const additionalUnits = (product.productUnits || [])
    .filter((pu) => pu.unitId !== product.unitId)
    .map((pu) => ({
      id: pu.unitId,
      name: pu.unit?.name || '',
      abbreviation: pu.unit?.abbreviation || '',
      conversionFactor: parseFloat(pu.conversionFactor) || 1,
      isBase: false,
      price: (parseFloat(product.sellPrice) || 0) * (parseFloat(pu.conversionFactor) || 1),
    }));

  const allUnits = [baseUnit, ...additionalUnits];
  const [selectedId, setSelectedId] = useState(baseUnit.id);
  const selected = allUnits.find((u) => u.id === selectedId) || baseUnit;

  const handleConfirm = () => {
    onSelect({
      unitId: selected.id,
      unitName: selected.abbreviation,
      unitPrice: selected.price,
      conversionFactor: selected.conversionFactor,
    });
  };

  const stock = product.stock || 0;
  const unitName = baseUnit.abbreviation;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-[380px] max-w-[95vw] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white p-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">{product.name}</h3>
              <p className="text-sm text-white/60 mt-1">
                {product.category?.name || ''}{product.sku ? ` · SKU: ${product.sku}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-white/50 hover:text-white transition-colors"
            >
              <HiX className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-3 mt-3">
            <div className="bg-white/15 rounded-lg px-3 py-1.5">
              <div className="text-[11px] text-white/50">Stok</div>
              <div className="text-base font-bold">
                {stock} <span className="text-sm font-normal">{unitName}</span>
              </div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-1.5">
              <div className="text-[11px] text-white/50">Harga Dasar</div>
              <div className="text-base font-bold">
                {formatRupiah(product.sellPrice)}<span className="text-sm font-normal">/{unitName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Unit Options */}
        <div className="p-4">
          <div className="text-xs font-semibold text-gray-400 mb-3 tracking-wide">PILIH UNIT PEMBELIAN</div>
          <div className="space-y-2">
            {allUnits.map((unit) => {
              const isSelected = selectedId === unit.id;
              return (
                <button
                  key={unit.id || 'base'}
                  onClick={() => setSelectedId(unit.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-teal-500' : 'bg-gray-200'
                      }`}
                    >
                      {isSelected && <HiCheck className="w-4 h-4 text-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">{unit.abbreviation}</div>
                      <div className="text-xs text-gray-500">
                        {unit.isBase ? 'Unit dasar' : `1 ${unit.abbreviation} = ${unit.conversionFactor} ${unitName}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-base text-teal-600">{formatRupiah(unit.price)}</div>
                    {!unit.isBase && (
                      <div className="text-[11px] text-gray-400">
                        {unit.conversionFactor} × {formatRupiah(product.sellPrice)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Button */}
        <div className="px-4 pb-4">
          <button
            onClick={handleConfirm}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl font-bold text-base shadow-lg shadow-teal-500/30 hover:from-teal-600 hover:to-teal-700 active:scale-[0.98] transition-all"
          >
            + Tambah ke Keranjang
          </button>
        </div>
      </div>
    </div>
  );
}
