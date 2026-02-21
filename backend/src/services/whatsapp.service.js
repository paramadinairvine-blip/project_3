const { format } = require('date-fns');
const waConfig = require('../config/whatsapp');

// ─── helpers ────────────────────────────────────────────────────────

/**
 * Format phone number to WhatsApp ID (country code + number + @c.us).
 * Accepts: 081234567890, 6281234567890, +6281234567890
 */
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/[\s\-\+\(\)]/g, '');

  // Convert leading 0 to Indonesian country code
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }

  // Ensure it ends with @c.us
  if (!cleaned.endsWith('@c.us')) {
    cleaned = cleaned + '@c.us';
  }

  return cleaned;
};

/**
 * Safe wrapper: runs the callback only if WA is enabled and ready.
 * Never throws — logs errors to console instead.
 */
const safeExecute = async (label, fn) => {
  try {
    if (!waConfig.isEnabled()) {
      console.log(`[WA] Dinonaktifkan — skip: ${label}`);
      return null;
    }

    const client = waConfig.getClient();
    const status = waConfig.getStatus();

    if (!status.ready || !client) {
      console.warn(`[WA] Belum terhubung — skip: ${label}`);
      return null;
    }

    return await fn(client);
  } catch (err) {
    console.error(`[WA] Error (${label}):`, err.message);
    return null;
  }
};

// ─── public API ─────────────────────────────────────────────────────

/**
 * Initialize the WhatsApp client.
 * Call this once on server startup.
 */
const initialize = async () => {
  if (!waConfig.isEnabled()) {
    console.log('[WA] WhatsApp dinonaktifkan (WA_ENABLED=false)');
    return;
  }

  try {
    const client = waConfig.getClient();
    if (client) {
      console.log('[WA] Memulai WhatsApp client...');
      await client.initialize();
    }
  } catch (err) {
    console.error('[WA] Gagal menginisialisasi WhatsApp client:', err.message);
    // Don't throw — server should keep running
  }
};

/**
 * Send a text message to a phone number.
 *
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message     - Message text
 * @returns {Promise<object|null>} Message result or null on failure
 */
const sendMessage = async (phoneNumber, message) => {
  return safeExecute(`sendMessage → ${phoneNumber}`, async (client) => {
    const chatId = formatPhoneNumber(phoneNumber);
    const result = await client.sendMessage(chatId, message);
    console.log(`[WA] Pesan terkirim → ${phoneNumber}`);
    return result;
  });
};

/**
 * Send low-stock alert to admin.
 *
 * @param {object[]} products - Array of { name, stock, unit, minStock }
 */
const sendLowStockAlert = async (products) => {
  if (!products || products.length === 0) return null;

  const lines = products.map(
    (p, i) => `${i + 1}. ${p.name} - Sisa: ${p.stock} ${p.unit || 'pcs'} (Min: ${p.minStock})`
  );

  const message =
    `⚠️ PERINGATAN STOK MINIMUM\n\n` +
    `Berikut produk dengan stok di bawah batas minimum:\n\n` +
    `${lines.join('\n')}\n\n` +
    `Total: ${products.length} produk\n` +
    `Waktu: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

  const adminPhone = process.env.WA_ADMIN_PHONE;
  if (!adminPhone) {
    console.warn('[WA] WA_ADMIN_PHONE tidak dikonfigurasi');
    return null;
  }

  return sendMessage(adminPhone, message);
};

/**
 * Send BON payment reminder.
 *
 * @param {object} transaction - Transaction with unitLembaga, transactionNumber, total, createdAt
 */
const sendBonReminder = async (transaction) => {
  const unitName = transaction.unitLembaga?.name || transaction.customerName || '-';
  const totalFormatted = Number(transaction.total).toLocaleString('id-ID');
  const dateFormatted = format(
    transaction.createdAt ? new Date(transaction.createdAt) : new Date(),
    'dd/MM/yyyy'
  );

  const message =
    `📋 PENGINGAT BON\n\n` +
    `Unit: ${unitName}\n` +
    `No. Transaksi: ${transaction.transactionNumber}\n` +
    `Total: Rp ${totalFormatted}\n` +
    `Tanggal: ${dateFormatted}\n\n` +
    `Harap segera dilunasi.`;

  const adminPhone = process.env.WA_ADMIN_PHONE;
  if (!adminPhone) {
    console.warn('[WA] WA_ADMIN_PHONE tidak dikonfigurasi');
    return null;
  }

  return sendMessage(adminPhone, message);
};

/**
 * Send PO notification (sent or received).
 *
 * @param {object} po   - Purchase order with supplier, poNumber, totalAmount
 * @param {string} type - "sent" or "received"
 */
const sendPONotification = async (po, type = 'sent') => {
  const supplierName = po.supplier?.name || '-';
  const totalFormatted = Number(po.totalAmount).toLocaleString('id-ID');
  const dateFormatted = format(new Date(), 'dd/MM/yyyy HH:mm');

  let message;
  if (type === 'sent') {
    message =
      `📦 PO TERKIRIM\n\n` +
      `No. PO: ${po.poNumber}\n` +
      `Supplier: ${supplierName}\n` +
      `Total: Rp ${totalFormatted}\n` +
      `Tanggal Kirim: ${dateFormatted}\n\n` +
      `PO telah dikirim ke supplier.`;
  } else {
    const itemCount = po.items ? po.items.length : 0;
    message =
      `✅ BARANG PO DITERIMA\n\n` +
      `No. PO: ${po.poNumber}\n` +
      `Supplier: ${supplierName}\n` +
      `Total: Rp ${totalFormatted}\n` +
      `Jumlah Item: ${itemCount}\n` +
      `Diterima: ${dateFormatted}\n\n` +
      `Stok telah diperbarui otomatis.`;
  }

  const adminPhone = process.env.WA_ADMIN_PHONE;
  if (!adminPhone) {
    console.warn('[WA] WA_ADMIN_PHONE tidak dikonfigurasi');
    return null;
  }

  return sendMessage(adminPhone, message);
};

/**
 * Get current WhatsApp connection status.
 *
 * @returns {object} { enabled, ready, hasQr }
 */
const getStatus = () => {
  return waConfig.getStatus();
};

/**
 * Disconnect the WhatsApp client gracefully.
 */
const disconnect = async () => {
  try {
    if (!waConfig.isEnabled()) return;

    const client = waConfig.getClient();
    if (client) {
      await client.destroy();
      waConfig.setReady(false);
      console.log('[WA] Client berhasil diputus.');
    }
  } catch (err) {
    console.error('[WA] Gagal memutus koneksi:', err.message);
  }
};

module.exports = {
  initialize,
  sendMessage,
  sendLowStockAlert,
  sendBonReminder,
  sendPONotification,
  getStatus,
  disconnect,
};
