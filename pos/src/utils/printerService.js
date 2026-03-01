/**
 * Printer Service - Recta Host integration for direct thermal printing
 * Connects to Recta Host via Socket.IO and sends ESC/POS commands
 * https://github.com/adenvt/recta-host
 */
import io from 'socket.io-client';
import { formatTanggalWaktu } from './formatDate';
import { TRANSACTION_TYPE_LABELS } from './constants';

const STORAGE_KEY = 'pos-printer-settings';
const CHAR_WIDTH = 32; // 58mm thermal printer character width

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

// ========== ESC/POS Command Builder ==========

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

class EscPosBuilder {
  constructor() {
    this.commands = [];
  }

  _write(bytes) {
    this.commands.push(new Uint8Array(bytes));
    return this;
  }

  _writeText(str) {
    const encoder = new TextEncoder();
    this.commands.push(encoder.encode(str));
    return this;
  }

  reset() {
    return this._write([ESC, 0x40]);
  }

  align(type) {
    const map = { LEFT: 0, CENTER: 1, RIGHT: 2 };
    return this._write([ESC, 0x61, map[type] || 0]);
  }

  bold(on) {
    return this._write([ESC, 0x45, on ? 1 : 0]);
  }

  underline(on) {
    return this._write([ESC, 0x2d, on ? 1 : 0]);
  }

  font(type) {
    // Font A = 0, Font B = 1 (smaller)
    return this._write([ESC, 0x4d, type === 'B' ? 1 : 0]);
  }

  text(str) {
    this._writeText(str);
    return this._write([LF]);
  }

  feed(n = 1) {
    for (let i = 0; i < n; i++) {
      this._write([LF]);
    }
    return this;
  }

  cut(partial = false) {
    return this._write([GS, 0x56, partial ? 1 : 0]);
  }

  toBuffer() {
    let totalLen = 0;
    for (const cmd of this.commands) {
      totalLen += cmd.length;
    }
    const buffer = new Uint8Array(totalLen);
    let offset = 0;
    for (const cmd of this.commands) {
      buffer.set(cmd, offset);
      offset += cmd.length;
    }
    return buffer;
  }
}

// ========== Formatting Helpers ==========

function formatLine(left, right, width = CHAR_WIDTH) {
  const rightStr = String(right);
  const maxLeft = width - rightStr.length - 1;
  const leftStr = String(left).substring(0, maxLeft);
  const spaces = width - leftStr.length - rightStr.length;
  return leftStr + ' '.repeat(Math.max(spaces, 1)) + rightStr;
}

function fmtRp(amount) {
  if (!amount && amount !== 0) return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  return num.toLocaleString('id-ID');
}

// ========== Socket.IO Connection to Recta Host ==========

function connectToRecta(appKey, port) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${port}`;
    const socket = io(url, {
      query: { token: appKey },
      reconnection: false,
      timeout: 5000,
      transports: ['websocket', 'polling'],
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Koneksi timeout'));
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error('Gagal terhubung: ' + (err.message || 'connection error')));
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error('Error: ' + (err.message || err)));
    });
  });
}

// ========== Public API ==========

/**
 * Print receipt via Recta Host (ESC/POS thermal printer)
 */
export async function printReceiptRecta(transaction, paidAmount, change) {
  const settings = getPrinterSettings();

  if (!settings.cetakStruk) {
    return { success: true, message: 'Cetak struk dinonaktifkan' };
  }

  const port = settings.socketPort || 1811;
  const appKey = settings.appKey || '';

  try {
    const socket = await connectToRecta(appKey, port);

    const trx = transaction;
    const items = trx.items || [];
    const dashes = '-'.repeat(CHAR_WIDTH);

    const esc = new EscPosBuilder();

    // Initialize printer
    esc.reset();

    // Store Header
    esc.align('CENTER')
      .bold(true)
      .text('TOKO MATERIAL')
      .text('PESANTREN DARUNNAJAH 2')
      .bold(false)
      .font('B')
      .text('Jl. Argapura, Kp. Cipining')
      .text('Desa Argapura, Kec. Cigudeg')
      .text('Telp: 085156526862')
      .font('A')
      .text(dashes);

    // Transaction Info
    esc.align('LEFT')
      .text('No : ' + (trx.transactionNumber || '-'))
      .text('Tgl: ' + formatTanggalWaktu(trx.createdAt))
      .text('Tipe: ' + (TRANSACTION_TYPE_LABELS[trx.type] || trx.type))
      .text('Petugas: ' + (trx.creator?.fullName || trx.createdBy?.fullName || '-'));

    if (trx.customerName) {
      esc.text('Pelanggan: ' + trx.customerName);
    }
    if (trx.kepanitiaan) {
      esc.text('Kepanitiaan: ' + trx.kepanitiaan);
    }

    esc.text(dashes);

    // Items
    for (const item of items) {
      const name = item.product?.name || '-';
      const qty = item.quantity || 0;
      const unit = item.product?.unit || 'pcs';
      const price = item.price || item.unitPrice || 0;
      const subtotal = item.subtotal || (qty * price);

      esc.bold(true).text(name).bold(false);
      esc.text(formatLine(
        `${qty} ${unit} x ${fmtRp(price)}`,
        fmtRp(subtotal)
      ));
    }

    esc.text(dashes);

    // Totals
    if (trx.discount > 0) {
      esc.text(formatLine('Subtotal', fmtRp(trx.subtotal)));
      esc.text(formatLine('Diskon', '-' + fmtRp(trx.discount)));
    }

    const total = trx.total || trx.totalAmount || 0;
    esc.bold(true)
      .text(formatLine('TOTAL', 'Rp ' + fmtRp(total)))
      .bold(false);

    // Payment info for CASH
    if (trx.type === 'CASH') {
      const paid = paidAmount || trx.paidAmount || 0;
      const chg = change !== undefined ? change : (trx.changeAmount || 0);
      esc.text(formatLine('Bayar', fmtRp(paid)));
      esc.bold(true)
        .text(formatLine('Kembalian', fmtRp(chg)))
        .bold(false);
    }

    esc.text(dashes);

    // Footer
    esc.align('CENTER')
      .font('B')
      .text('Terima kasih atas kunjungan Anda')
      .text('Barang yang sudah dibeli')
      .text('tidak dapat dikembalikan')
      .font('A')
      .feed(3)
      .cut();

    // Send buffer to Recta Host
    const buffer = esc.toBuffer();
    socket.send(buffer.buffer);

    // Disconnect after sending
    setTimeout(() => {
      try { socket.disconnect(); } catch { /* ignore */ }
    }, 1000);

    return { success: true, message: 'Berhasil dicetak via Recta Host' };
  } catch (error) {
    return {
      success: false,
      message: `Gagal cetak: ${error.message || 'Pastikan Recta Host berjalan'}`,
    };
  }
}

/**
 * Test printer connection via Recta Host
 */
export async function testPrinterConnection(settings) {
  const port = settings.socketPort || 1811;
  const appKey = settings.appKey || '';

  try {
    const socket = await connectToRecta(appKey, port);

    // Build test print
    const esc = new EscPosBuilder();
    esc.reset()
      .align('CENTER')
      .bold(true)
      .text('=== TEST PRINTER ===')
      .bold(false)
      .text('Koneksi berhasil!')
      .text('Recta Host terhubung')
      .text('Port: ' + port)
      .feed(3)
      .cut();

    socket.send(esc.toBuffer().buffer);

    setTimeout(() => {
      try { socket.disconnect(); } catch { /* ignore */ }
    }, 500);

    return { connected: true, message: `Terhubung ke Recta Host (port ${port})` };
  } catch (error) {
    return { connected: false, message: error.message || 'Gagal terhubung ke Recta Host' };
  }
}

/**
 * Fallback: print via browser print dialog
 */
export function printViaBrowser(receiptHtml) {
  return new Promise((resolve) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
      resolve({ success: true, message: 'Dicetak via browser' });
    } else {
      resolve({ success: false, message: 'Popup diblokir browser' });
    }
  });
}
