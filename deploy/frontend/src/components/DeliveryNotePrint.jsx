import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { HiPrinter, HiX } from 'react-icons/hi';
import { Button } from './common';
import { formatTanggalPanjang } from '../utils/formatDate';

export default function DeliveryNotePrint({ transaction, onClose }) {
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `SuratJalan-${transaction.transactionNumber}`,
  });

  const trx = transaction;
  const items = trx.items || [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Preview Surat Jalan</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <HiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-6">
          <div
            ref={printRef}
            className="mx-auto bg-white p-8"
            style={{ maxWidth: '210mm', fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '1.6' }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #000', paddingBottom: '12px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>TOKO MATERIAL PESANTREN</h1>
              <p style={{ fontSize: '11px', color: '#555', margin: '0' }}>Jl. Pesantren No. 1 | Telp: (021) 1234567</p>
            </div>

            {/* Title */}
            <h2 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', margin: '0 0 20px 0', textDecoration: 'underline' }}>
              SURAT JALAN
            </h2>

            {/* Info */}
            <div style={{ marginBottom: '20px' }}>
              <table style={{ fontSize: '12px' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold' }}>No. Surat Jalan</td>
                    <td style={{ padding: '2px 8px' }}>:</td>
                    <td style={{ padding: '2px 0' }}>{trx.transactionNumber}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold' }}>Tanggal</td>
                    <td style={{ padding: '2px 8px' }}>:</td>
                    <td style={{ padding: '2px 0' }}>{formatTanggalPanjang(trx.createdAt)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold' }}>Tujuan</td>
                    <td style={{ padding: '2px 8px' }}>:</td>
                    <td style={{ padding: '2px 0' }}>{trx.unitLembaga?.name || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', width: '40px' }}>No</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Nama Barang</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', width: '70px' }}>Qty</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', width: '80px' }}>Satuan</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px' }}>
                      {item.product?.name || '-'}
                      {item.variant ? ` — ${item.variant.name}` : ''}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'center' }}>
                      {item.unit?.name || item.product?.unit || 'pcs'}
                    </td>
                    <td style={{ border: '1px solid #d1d5db', padding: '6px 8px' }}>{item.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '60px' }}>Yang Menyerahkan</p>
                <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto 4px auto' }} />
                <p>{trx.createdBy?.fullName || trx.user?.fullName || '........................'}</p>
              </div>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '60px' }}>Yang Menerima</p>
                <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto 4px auto' }} />
                <p>........................</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button icon={HiPrinter} onClick={handlePrint}>Cetak Surat Jalan</Button>
        </div>
      </div>
    </div>
  );
}
