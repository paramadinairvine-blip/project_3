/**
 * Printer Service - Direct thermal printing via Recta Host
 * https://github.com/adenvt/recta
 */
import Recta from 'recta/dist/recta.js';
import { formatRupiah } from './formatCurrency';
import { formatTanggalWaktu } from './formatDate';
import { TRANSACTION_TYPE_LABELS } from './constants';

const STORAGE_KEY = 'pos-printer-settings';
const RECEIPT_WIDTH = 32; // characters for 58mm, use 48 for 80mm

const defaultSettings = {
  cetakStruk: true,
  appKey: '',
  socketPort: 1811,
};

export function getPrinterSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function savePrinterSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/**
 * Check if Recta is configured (has appKey and port)
 */
export function isRectaConfigured() {
  const settings = getPrinterSettings();
  return settings.socketPort > 0 && settings.appKey;
}

/**
 * Format a line with left and right aligned text
 */
function lineLeftRight(left, right, width = RECEIPT_WIDTH) {
  const space = width - left.length - right.length;
  if (space <= 0) return left + ' ' + right;
  return left + ' '.repeat(space) + right;
}

/**
 * Separator line
 */
function separator(char = '-', width = RECEIPT_WIDTH) {
  return char.repeat(width);
}

/**
 * Print receipt directly to thermal printer via Recta Host
 */
export async function printReceipt(transaction, paidAmount, change) {
  const settings = getPrinterSettings();

  if (!settings.cetakStruk) {
    return { success: true, message: 'Cetak struk dinonaktifkan' };
  }

  if (!settings.socketPort || !settings.appKey) {
    return { success: false, message: 'Recta Host belum dikonfigurasi. Atur APP Key dan Port di Setting Printer.', fallback: true };
  }

  try {
    const printer = new Recta(settings.appKey, String(settings.socketPort));
    await printer.open();

    const trx = transaction;
    const items = trx.items || [];

    // Header
    printer
      .align('center')
      .bold(true)
      .text('TOKO MATERIAL')
      .text('PESANTREN DARUNNAJAH 2')
      .bold(false)
      .text('Jl. Argapura, Kp. Cipining')
      .text('Desa Argapura, Kec. Cigudeg')
      .text('Telp: 085156526862')
      .text(separator('='));

    // Transaction info
    printer
      .align('left')
      .text('No : ' + (trx.transactionNumber || '-'))
      .text('Tgl: ' + formatTanggalWaktu(trx.createdAt))
      .text('Tipe: ' + (TRANSACTION_TYPE_LABELS[trx.type] || trx.type));

    const staffName = trx.creator?.fullName || trx.createdBy?.fullName || '-';
    printer.text('Petugas: ' + staffName);

    if (trx.unitLembaga?.name) {
      printer.text('Unit: ' + trx.unitLembaga.name);
    }
    if (trx.kepanitiaan) {
      printer.text('Kepanitiaan: ' + trx.kepanitiaan);
    }
    if (trx.customerName) {
      printer.text('Pelanggan: ' + trx.customerName);
    }
    if (trx.customerPhone) {
      printer.text('Telp: ' + trx.customerPhone);
    }

    printer.text(separator('-'));

    // Items
    for (const item of items) {
      const name = item.product?.name || '-';
      const qty = item.quantity;
      const unitPrice = item.price || item.unitPrice || 0;
      const unit = item.product?.unit || item.product?.unitOfMeasure?.abbreviation || 'pcs';
      const subtotal = item.subtotal || (qty * unitPrice);

      printer
        .bold(true)
        .text(name)
        .bold(false)
        .text(lineLeftRight(
          `  ${qty} ${unit} x ${formatRupiah(unitPrice)}`,
          formatRupiah(subtotal)
        ));
    }

    printer.text(separator('-'));

    // Totals
    const total = trx.total || trx.totalAmount || 0;

    if (trx.discount > 0) {
      printer
        .text(lineLeftRight('Subtotal', formatRupiah(trx.subtotal)))
        .text(lineLeftRight('Diskon', '-' + formatRupiah(trx.discount)));
    }

    printer
      .bold(true)
      .text(lineLeftRight('TOTAL', formatRupiah(total)))
      .bold(false);

    // Payment info (CASH)
    if (trx.type === 'CASH') {
      const paid = paidAmount !== undefined ? paidAmount : trx.paidAmount || 0;
      const chg = change !== undefined ? change : trx.changeAmount || 0;

      printer
        .text(lineLeftRight('Bayar', formatRupiah(paid)))
        .bold(true)
        .text(lineLeftRight('Kembalian', formatRupiah(chg)))
        .bold(false);
    }

    printer.text(separator('='));

    // Footer
    printer
      .align('center')
      .text('Terima kasih atas')
      .text('kunjungan Anda')
      .text('')
      .text('Barang yang sudah dibeli')
      .text('tidak dapat dikembalikan')
      .text('')
      .text('')
      .cut();

    await printer.print();

    return { success: true, message: 'Struk berhasil dicetak' };
  } catch (err) {
    console.error('Recta print error:', err);
    return {
      success: false,
      message: 'Gagal mencetak: ' + (err.message || 'Pastikan Recta Host berjalan'),
      fallback: true,
    };
  }
}

/**
 * Test Recta Host connection
 */
export async function testPrinterConnection(settings) {
  if (!settings.socketPort || settings.socketPort <= 0) {
    return { connected: false, message: 'Port belum dikonfigurasi' };
  }

  if (!settings.appKey) {
    return { connected: false, message: 'APP Key belum diisi' };
  }

  try {
    const printer = new Recta(settings.appKey, String(settings.socketPort));
    await printer.open();
    await printer.close();
    return { connected: true, message: `Terhubung ke Recta Host (port ${settings.socketPort})` };
  } catch (err) {
    return {
      connected: false,
      message: 'Gagal terhubung - pastikan Recta Host berjalan. ' + (err.message || ''),
    };
  }
}
