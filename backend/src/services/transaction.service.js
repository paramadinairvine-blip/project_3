const { PrismaClient } = require('@prisma/client');
const { format } = require('date-fns');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');
const { createLog, ACTION_TYPES } = require('./auditLog.service');

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────

const transactionIncludes = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, sku: true, barcode: true, unit: true },
      },
    },
  },
  creator: { select: { id: true, fullName: true, email: true } },
  updater: { select: { id: true, fullName: true } },
  project: { select: { id: true, name: true } },
  unitLembaga: { select: { id: true, name: true } },
};

/**
 * Generate the next transaction number for today.
 * Format: TRX-YYYYMMDD-XXXX (auto-increment per day).
 */
const generateTransactionNumber = async (tx) => {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `TRX-${today}-`;

  const last = await tx.transaction.findFirst({
    where: { transactionNumber: { startsWith: prefix } },
    orderBy: { transactionNumber: 'desc' },
    select: { transactionNumber: true },
  });

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.transactionNumber.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

/**
 * Convert quantity to base-unit quantity using ProductUnit conversion factor.
 * Returns the original quantity if no conversion is needed / found.
 */
const convertToBaseQty = async (tx, productId, unitId, quantity) => {
  if (!unitId) return quantity;

  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { unitId: true },
  });

  if (!product || !product.unitId || product.unitId === unitId) return quantity;

  const pu = await tx.productUnit.findUnique({
    where: { productId_unitId: { productId, unitId } },
  });

  if (pu) return Math.round(quantity * Number(pu.conversionFactor));
  return quantity;
};

/**
 * Deduct stock for a single product inside an existing prisma transaction.
 * Creates a StockMovement OUT record.
 */
const deductStock = async (tx, { productId, quantity, referenceId, userId, unitId }) => {
  const qty = await convertToBaseQty(tx, productId, unitId, quantity);
  const product = await tx.product.findUnique({ where: { id: productId } });

  if (!product) throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });

  const newStock = product.stock - qty;
  if (newStock < 0) {
    throw Object.assign(
      new Error(`Stok ${product.name} tidak mencukupi (tersisa ${product.stock})`),
      { status: 400 }
    );
  }

  await tx.stockMovement.create({
    data: {
      productId,
      type: 'OUT',
      quantity: qty,
      previousStock: product.stock,
      newStock,
      referenceType: 'TRANSACTION',
      referenceId,
      notes: `Penjualan transaksi`,
      createdBy: userId,
    },
  });

  await tx.product.update({ where: { id: productId }, data: { stock: newStock } });
};

/**
 * Restore stock for a single product inside an existing prisma transaction.
 * Creates a StockMovement IN record (used by cancel).
 */
const restoreStock = async (tx, { productId, quantity, referenceId, userId, unitId }) => {
  const qty = await convertToBaseQty(tx, productId, unitId, quantity);
  const product = await tx.product.findUnique({ where: { id: productId } });

  if (!product) throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });

  const newStock = product.stock + qty;

  await tx.stockMovement.create({
    data: {
      productId,
      type: 'IN',
      quantity: qty,
      previousStock: product.stock,
      newStock,
      referenceType: 'TRANSACTION',
      referenceId,
      notes: `Pembatalan transaksi`,
      createdBy: userId,
    },
  });

  await tx.product.update({ where: { id: productId }, data: { stock: newStock } });
};

// ─── public API ─────────────────────────────────────────────────────

/**
 * List transactions with filters and pagination.
 */
const getAll = async ({
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  type,
  status,
  unitLembagaId,
  startDate,
  endDate,
} = {}) => {
  const where = {};

  if (type) where.type = type;
  if (status) where.status = status;
  if (unitLembagaId) where.unitLembagaId = unitLembagaId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: transactionIncludes,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Get a single transaction by ID with full relations.
 */
const getById = async (id) => {
  const trx = await prisma.transaction.findUnique({
    where: { id },
    include: transactionIncludes,
  });

  if (!trx) throw Object.assign(new Error('Transaksi tidak ditemukan'), { status: 404 });
  return trx;
};

/**
 * Create a new transaction.
 *
 * data shape:
 * {
 *   type: 'CASH' | 'BON' | 'ANGGARAN',
 *   customerName?, customerPhone?, notes?,
 *   discount?, tax?, paidAmount?,
 *   projectId?, unitLembagaId?,
 *   items: [{ productId, quantity, price, discount?, unitId? }]
 * }
 */
const create = async (data, userId) => {
  const { items, ...header } = data;

  const transaction = await prisma.$transaction(async (tx) => {
    const transactionNumber = await generateTransactionNumber(tx);

    // Calculate totals
    let subtotal = 0;
    const processedItems = items.map((item) => {
      const itemDiscount = item.discount || 0;
      const itemSubtotal = item.quantity * item.price - itemDiscount;
      subtotal += itemSubtotal;
      return { ...item, discount: itemDiscount, subtotal: itemSubtotal };
    });

    const discount = header.discount || 0;
    const tax = header.tax || 0;
    const total = subtotal - discount + tax;
    const paidAmount = header.paidAmount || 0;
    const changeAmount = paidAmount > total ? paidAmount - total : 0;

    // Determine initial status
    let status = 'COMPLETED';
    if (header.type === 'BON') {
      status = 'PENDING'; // BON starts as pending until paid
    }

    // Create transaction header
    const created = await tx.transaction.create({
      data: {
        transactionNumber,
        type: header.type,
        status,
        customerName: header.customerName || null,
        customerPhone: header.customerPhone || null,
        notes: header.notes || null,
        subtotal,
        discount,
        tax,
        total,
        paidAmount,
        changeAmount,
        dueDate: header.dueDate ? new Date(header.dueDate) : null,
        paidAt: status === 'COMPLETED' ? new Date() : null,
        projectId: header.projectId || null,
        unitLembagaId: header.unitLembagaId || null,
        createdBy: userId,
      },
    });

    // Create items & deduct stock
    for (const item of processedItems) {
      await tx.transactionItem.create({
        data: {
          transactionId: created.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          subtotal: item.subtotal,
        },
      });

      // Deduct stock
      await deductStock(tx, {
        productId: item.productId,
        quantity: item.quantity,
        referenceId: created.id,
        userId,
        unitId: item.unitId,
      });
    }

    // Update project spent if linked
    if (header.projectId) {
      await tx.project.update({
        where: { id: header.projectId },
        data: { spent: { increment: total } },
      });
    }

    return tx.transaction.findUnique({
      where: { id: created.id },
      include: transactionIncludes,
    });
  });

  // Audit log
  await createLog({
    userId,
    action: ACTION_TYPES.CREATE,
    tableName: 'transactions',
    recordId: transaction.id,
    newData: {
      transactionNumber: transaction.transactionNumber,
      type: transaction.type,
      total: transaction.total,
      itemCount: items.length,
    },
  });

  // If BON, send WhatsApp notification to admin (fire-and-forget)
  if (data.type === 'BON') {
    sendBonNotification(transaction).catch((err) =>
      console.error('[WA] Gagal kirim notifikasi BON:', err.message)
    );
  }

  return transaction;
};

/**
 * Cancel a transaction: set status=CANCELLED, restore all stock.
 */
const cancel = async (id, userId) => {
  const existing = await prisma.transaction.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!existing) throw Object.assign(new Error('Transaksi tidak ditemukan'), { status: 404 });
  if (existing.status === 'CANCELLED') {
    throw Object.assign(new Error('Transaksi sudah dibatalkan sebelumnya'), { status: 400 });
  }

  const transaction = await prisma.$transaction(async (tx) => {
    // Restore stock for every item
    for (const item of existing.items) {
      await restoreStock(tx, {
        productId: item.productId,
        quantity: item.quantity,
        referenceId: id,
        userId,
      });
    }

    // Revert project spent if linked
    if (existing.projectId) {
      await tx.project.update({
        where: { id: existing.projectId },
        data: { spent: { decrement: existing.total } },
      });
    }

    return tx.transaction.update({
      where: { id },
      data: { status: 'CANCELLED', updatedBy: userId },
      include: transactionIncludes,
    });
  });

  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'transactions',
    recordId: id,
    oldData: { status: existing.status },
    newData: { status: 'CANCELLED' },
  });

  return transaction;
};

/**
 * Get transactions for a specific unit lembaga, optionally within a date range.
 */
const getByUnitLembaga = async (unitLembagaId, { startDate, endDate, page = 1, limit = DEFAULT_PAGE_SIZE } = {}) => {
  const where = { unitLembagaId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: transactionIncludes,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { data, total, page, limit };
};

// ─── WhatsApp notification (stub – actual WA integration later) ─────

/**
 * Send a WhatsApp notification about a BON transaction to admins.
 * This is a placeholder; the real implementation will use whatsapp-web.js.
 */
const sendBonNotification = async (transaction) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true, fullName: true, phone: true },
  });

  for (const admin of admins) {
    if (!admin.phone) continue;

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'Transaksi BON Baru',
        message: `Transaksi BON ${transaction.transactionNumber} sebesar Rp ${Number(transaction.total).toLocaleString('id-ID')} oleh ${transaction.customerName || 'pelanggan'}.`,
        type: 'TRANSACTION_BON',
        status: 'PENDING',
      },
    });

    // TODO: Send via whatsapp-web.js when WA service is configured
    console.log(`[WA] Notifikasi BON → ${admin.fullName} (${admin.phone}): ${transaction.transactionNumber}`);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  cancel,
  getByUnitLembaga,
};
