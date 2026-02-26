import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { HiPrinter, HiX } from 'react-icons/hi';
import { Button } from './common';
import { formatRupiah } from '../utils/formatCurrency';
import { formatTanggalWaktu } from '../utils/formatDate';
import { TRANSACTION_TYPE_LABELS } from '../utils/constants';

export default function ReceiptPrint({ transaction, onClose }) {
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Nota-${transaction.transactionNumber}`,
  });

  const trx = transaction;
  const items = trx.items || [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Preview Nota</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-4">
          <div
            ref={printRef}
            className="mx-auto bg-white"
            style={{ width: '80mm', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.4' }}
          >
            {/* Store Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <p style={{ fontWeight: 'bold', fontSize: '14px' }}>TOKO MATERIAL PESANTREN</p>
              <p style={{ fontSize: '10px' }}>Jl. Pesantren No. 1</p>
              <p style={{ fontSize: '10px' }}>Telp: (021) 1234567</p>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
            </div>

            {/* Transaction Info */}
            <div style={{ marginBottom: '8px' }}>
              <p>No : {trx.transactionNumber}</p>
              <p>Tgl: {formatTanggalWaktu(trx.createdAt)}</p>
              <p>Tipe: {TRANSACTION_TYPE_LABELS[trx.type] || trx.type}</p>
              <p>Petugas: {trx.createdBy?.fullName || trx.user?.fullName || '-'}</p>
              {trx.unitLembaga && <p>Unit: {trx.unitLembaga.name}</p>}
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
            </div>

            {/* Items */}
            <div style={{ marginBottom: '8px' }}>
              {items.map((item, idx) => {
                const total = item.totalPrice || (item.quantity * item.unitPrice);
                return (
                  <div key={idx} style={{ marginBottom: '4px' }}>
                    <p style={{ fontWeight: 'bold' }}>{item.product?.name || '-'}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        {item.quantity} {item.unit?.name || item.product?.unit || 'pcs'} x {formatRupiah(item.unitPrice)}
                      </span>
                      <span>{formatRupiah(total)}</span>
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
            </div>

            {/* Total */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                <span>TOTAL</span>
                <span>{formatRupiah(trx.totalAmount)}</span>
              </div>
              <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '10px' }}>
              <p>Terima kasih atas kunjungan Anda</p>
              <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button icon={HiPrinter} onClick={handlePrint}>Cetak Nota</Button>
        </div>
      </div>
    </div>
  );
}
