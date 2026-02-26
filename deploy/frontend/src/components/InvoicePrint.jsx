import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { HiPrinter, HiX } from 'react-icons/hi';
import { Button } from './common';
import { formatRupiah } from '../utils/formatCurrency';
import { formatTanggalPanjang } from '../utils/formatDate';
import { TRANSACTION_TYPE_LABELS } from '../utils/constants';

/**
 * Convert number to Indonesian text (terbilang).
 * e.g. 1250000 → "Satu Juta Dua Ratus Lima Puluh Ribu"
 */
function terbilang(angka) {
  const huruf = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas',
  ];

  const convert = (n) => {
    n = Math.abs(Math.floor(n));
    if (n < 12) return huruf[n];
    if (n < 20) return huruf[n - 10] + ' Belas';
    if (n < 100) return huruf[Math.floor(n / 10)] + ' Puluh' + (n % 10 ? ' ' + huruf[n % 10] : '');
    if (n < 200) return 'Seratus' + (n - 100 ? ' ' + convert(n - 100) : '');
    if (n < 1000) return huruf[Math.floor(n / 100)] + ' Ratus' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 2000) return 'Seribu' + (n - 1000 ? ' ' + convert(n - 1000) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 ? ' ' + convert(n % 1000000) : '');
    if (n < 1000000000000) return convert(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 ? ' ' + convert(n % 1000000000) : '');
    return convert(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 ? ' ' + convert(n % 1000000000000) : '');
  };

  if (!angka || angka === 0) return 'Nol';
  return convert(Number(angka)).trim() + ' Rupiah';
}

export default function InvoicePrint({ transaction, onClose }) {
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Faktur-${transaction.transactionNumber}`,
  });

  const trx = transaction;
  const items = trx.items || [];
  const total = Number(trx.totalAmount) || 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Preview Faktur</h3>
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
            {/* Store Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px double #000', paddingBottom: '12px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0' }}>TOKO MATERIAL PESANTREN</h1>
              <p style={{ fontSize: '11px', color: '#555', margin: '0' }}>Jl. Pesantren No. 1</p>
              <p style={{ fontSize: '11px', color: '#555', margin: '0' }}>Telp: (021) 1234567 | Email: toko@pesantren.id</p>
            </div>

            {/* Title */}
            <h2 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', margin: '0 0 20px 0' }}>
              FAKTUR / INVOICE
            </h2>

            {/* Info row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <table style={{ fontSize: '12px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold' }}>No. Faktur</td>
                      <td style={{ padding: '2px 8px' }}>:</td>
                      <td style={{ padding: '2px 0' }}>{trx.transactionNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold' }}>Tanggal</td>
                      <td style={{ padding: '2px 8px' }}>:</td>
                      <td style={{ padding: '2px 0' }}>{formatTanggalPanjang(trx.createdAt)}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold' }}>Tipe</td>
                      <td style={{ padding: '2px 8px' }}>:</td>
                      <td style={{ padding: '2px 0' }}>{TRANSACTION_TYPE_LABELS[trx.type] || trx.type}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table style={{ fontSize: '12px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold' }}>Kepada</td>
                      <td style={{ padding: '2px 8px' }}>:</td>
                      <td style={{ padding: '2px 0' }}>{trx.unitLembaga?.name || '-'}</td>
                    </tr>
                    {trx.unitLembaga?.address && (
                      <tr>
                        <td style={{ padding: '2px 8px 2px 0', fontWeight: 'bold' }}>Alamat</td>
                        <td style={{ padding: '2px 8px' }}>:</td>
                        <td style={{ padding: '2px 0' }}>{trx.unitLembaga.address}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', width: '40px' }}>No</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Nama Barang</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', width: '60px' }}>Qty</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', width: '70px' }}>Satuan</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', width: '120px' }}>Harga Satuan</th>
                  <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', width: '120px' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const itemTotal = item.totalPrice || (item.quantity * item.unitPrice);
                  return (
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
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right' }}>{formatRupiah(item.unitPrice)}</td>
                      <td style={{ border: '1px solid #d1d5db', padding: '6px 8px', textAlign: 'right' }}>{formatRupiah(itemTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                    TOTAL
                  </td>
                  <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                    {formatRupiah(total)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Terbilang */}
            <div style={{ marginBottom: '40px', padding: '8px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
              <p style={{ fontSize: '11px', margin: 0 }}>
                <strong>Terbilang:</strong> <em>{terbilang(total)}</em>
              </p>
            </div>

            {/* Signature */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <div style={{ textAlign: 'center', width: '200px' }}>
                <p style={{ margin: '0 0 60px 0' }}>Petugas,</p>
                <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto 4px auto' }} />
                <p style={{ margin: 0 }}>{trx.createdBy?.fullName || trx.user?.fullName || '........................'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button icon={HiPrinter} onClick={handlePrint}>Cetak Faktur</Button>
        </div>
      </div>
    </div>
  );
}
