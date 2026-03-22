/**
 * Printer Service - Direct thermal printing via Recta Host
 * Uses socket.io-client v2 to match Recta Host's protocol
 * https://github.com/adenvt/recta-host
 */
import io from 'socket.io-client';
import { formatRupiah } from './formatCurrency';
import { formatTanggalWaktu } from './formatDate';
import { TRANSACTION_TYPE_LABELS, STORE_INFO } from './constants';

const STORAGE_KEY = 'pos-printer-settings';
const CHAR_WIDTH = 32; // 58mm thermal printer

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

export function isRectaConfigured() {
  const settings = getPrinterSettings();
  return settings.socketPort > 0 && !!settings.appKey;
}

// ============ ESC/POS Buffer Builder ============

const ESC = 0x1b;
const GS = 0x1d;

class ReceiptBuilder {
  constructor() {
    this.parts = [];
  }

  _raw(bytes) {
    this.parts.push(new Uint8Array(bytes));
    return this;
  }

  _str(text) {
    const enc = new TextEncoder();
    this.parts.push(enc.encode(text));
    return this;
  }

  init() {
    return this._raw([ESC, 0x40]); // ESC @
  }

  align(type) {
    const map = { left: 0, center: 1, right: 2 };
    return this._raw([ESC, 0x61, map[type] || 0]);
  }

  bold(on) {
    return this._raw([ESC, 0x45, on ? 1 : 0]);
  }

  text(str) {
    return this._str(str + '\n');
  }

  feed(n = 1) {
    for (let i = 0; i < n; i++) this._raw([0x0a]);
    return this;
  }

  cut() {
    return this._raw([GS, 0x56, 0x00]).feed(4);
  }

  toBuffer() {
    let len = 0;
    for (const p of this.parts) len += p.length;
    const buf = new Uint8Array(len);
    let off = 0;
    for (const p of this.parts) {
      buf.set(p, off);
      off += p.length;
    }
    return buf;
  }
}

// ============ Formatting ============

function lr(left, right, w = CHAR_WIDTH) {
  const r = String(right);
  const l = String(left).substring(0, w - r.length - 1);
  const sp = w - l.length - r.length;
  return l + ' '.repeat(Math.max(sp, 1)) + r;
}

function dashes(w = CHAR_WIDTH) {
  return '-'.repeat(w);
}

function equals(w = CHAR_WIDTH) {
  return '='.repeat(w);
}

// ============ Socket Connection ============

function connectRecta(appKey, port) {
  return new Promise((resolve, reject) => {
    const socket = io(`ws://localhost:${port}`, {
      transports: ['websocket'],
      query: `token=${appKey}`,
      autoConnect: false,
      reconnection: false,
    });

    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('Timeout - Recta Host tidak merespon. Pastikan Recta Host sudah berjalan.'));
    }, 5000);

    socket.open();

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.once('connect_error', (err) => {
      clearTimeout(timeout);
      socket.close();
      reject(new Error('Gagal koneksi: ' + (err.message || err)));
    });

    socket.once('connect_timeout', () => {
      clearTimeout(timeout);
      socket.close();
      reject(new Error('Timeout koneksi'));
    });

    socket.once('error', (err) => {
      clearTimeout(timeout);
      socket.close();
      reject(new Error('Error: ' + (err.message || err)));
    });
  });
}

// ============ Public API ============

export async function printReceipt(transaction, paidAmount, change) {
  const settings = getPrinterSettings();

  if (!settings.cetakStruk) {
    return { success: true, message: 'Cetak struk dinonaktifkan' };
  }

  if (!settings.socketPort || !settings.appKey) {
    return { success: false, message: 'Recta belum dikonfigurasi', fallback: true };
  }

  try {
    const socket = await connectRecta(settings.appKey, settings.socketPort);
    const trx = transaction;
    const items = trx.items || [];

    const r = new ReceiptBuilder();
    r.init();

    // Header
    r.align('center')
      .bold(true)
      .text(STORE_INFO.SHORT_NAME)
      .text(STORE_INFO.SUBTITLE)
      .bold(false)
      .text(STORE_INFO.ADDRESS_LINE1)
      .text(STORE_INFO.ADDRESS_LINE2)
      .text('Telp: ' + STORE_INFO.SUPPORT_PHONE)
      .text(equals());

    // Transaction info
    r.align('left')
      .text('No : ' + (trx.transactionNumber || '-'))
      .text('Tgl: ' + formatTanggalWaktu(trx.createdAt))
      .text('Tipe: ' + (TRANSACTION_TYPE_LABELS[trx.type] || trx.type))
      .text('Petugas: ' + (trx.creator?.fullName || trx.createdBy?.fullName || '-'));

    if (trx.customerName) r.text('Pelanggan: ' + trx.customerName);
    if (trx.kepanitiaan) r.text('Kepanitiaan: ' + trx.kepanitiaan);
    if (trx.customerPhone) r.text('Telp: ' + trx.customerPhone);

    r.text(dashes());

    // Items
    for (const item of items) {
      const name = item.product?.name || '-';
      const qty = item.quantity || 0;
      const unit = item.unit?.abbreviation || item.product?.unitOfMeasure?.abbreviation || item.product?.unit || 'pcs';
      const price = item.price || item.unitPrice || 0;
      const subtotal = item.subtotal || (qty * price);

      r.bold(true).text(name).bold(false);
      r.text(lr(`  ${qty} ${unit} x ${formatRupiah(price)}`, formatRupiah(subtotal)));
    }

    r.text(dashes());

    // Totals
    if (trx.discount > 0) {
      r.text(lr('Subtotal', formatRupiah(trx.subtotal)));
      r.text(lr('Diskon', '-' + formatRupiah(trx.discount)));
    }

    const total = trx.total || 0;
    r.bold(true).text(lr('TOTAL', formatRupiah(total))).bold(false);

    if (trx.type === 'CASH') {
      const paid = paidAmount !== undefined ? paidAmount : trx.paidAmount || 0;
      const chg = change !== undefined ? change : trx.changeAmount || 0;
      r.text(lr('Bayar', formatRupiah(paid)));
      r.bold(true).text(lr('Kembalian', formatRupiah(chg))).bold(false);
    }

    r.text(equals());

    // Footer
    r.align('center')
      .text('Terima kasih atas')
      .text('kunjungan Anda')
      .text('')
      .text('Barang yang sudah dibeli')
      .text('tidak dapat dikembalikan')
      .feed(2)
      .cut();

    // Send to Recta Host as ArrayBuffer
    // Socket.IO v2 hasBinary only detects Buffer/ArrayBuffer/Blob/File, NOT Uint8Array
    // So we must convert to ArrayBuffer for proper binary transmission
    const buffer = r.toBuffer();
    socket.send(buffer.buffer);

    // Disconnect after brief delay
    setTimeout(() => {
      try { socket.close(); } catch { /* ok */ }
    }, 1000);

    return { success: true, message: 'Struk berhasil dicetak' };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Gagal mencetak - pastikan Recta Host berjalan',
      fallback: true,
    };
  }
}

export async function testPrinterConnection(settings) {
  if (!settings.socketPort || !settings.appKey) {
    return { connected: false, message: 'APP Key dan Port harus diisi' };
  }

  try {
    const socket = await connectRecta(settings.appKey, settings.socketPort);

    // Print test receipt
    const r = new ReceiptBuilder();
    r.init()
      .align('center')
      .bold(true)
      .text('=== TEST PRINTER ===')
      .bold(false)
      .text('Koneksi berhasil!')
      .text('Recta Host terhubung')
      .text('Port: ' + settings.socketPort)
      .feed(3)
      .cut();

    socket.send(r.toBuffer().buffer);

    setTimeout(() => {
      try { socket.close(); } catch { /* ok */ }
    }, 500);

    return { connected: true, message: `Terhubung ke Recta Host (port ${settings.socketPort})` };
  } catch (err) {
    return {
      connected: false,
      message: err.message || 'Gagal terhubung ke Recta Host',
    };
  }
}
