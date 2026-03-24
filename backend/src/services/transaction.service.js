const prisma = require('../lib/prisma');
const { Prisma } = require('@prisma/client');
const { format } = require('date-fns');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');
const { createLog, ACTION_TYPES } = require('./auditLog.service');
const { sendTransactionNotification } = require('./telegram.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// Format tanggal dalam WIB (+07:00)
const formatWIB = (date, fmt) => {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return format(wib, fmt);
};

// ─── helpers ────────────────────────────────────────────────────────

const transactionIncludes = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, sku: true, barcode: true, unit: true, unitOfMeasure: { select: { id: true, name: true, abbreviation: true } } },
      },
      unit: { select: { id: true, name: true, abbreviation: true } },
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
  const today = formatWIB(new Date(), 'yyyyMMdd');
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

  if (!product) throw new AppError('Produk tidak ditemukan', 404);

  const newStock = product.stock - qty;
  if (newStock < 0) {
    throw new AppError(`Stok ${product.name} tidak mencukupi (tersisa ${product.stock})`, 400);
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

  if (!product) throw new AppError('Produk tidak ditemukan', 404);

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
  search,
  customerName,
} = {}) => {
  const where = {};

  if (type) where.type = type;
  if (status) where.status = status;
  if (unitLembagaId) where.unitLembagaId = unitLembagaId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      if (!String(endDate).includes('T')) end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  if (search) {
    where.transactionNumber = { contains: search, mode: 'insensitive' };
  }
  if (customerName) {
    where.customerName = { contains: customerName, mode: 'insensitive' };
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

  if (!trx) throw new AppError('Transaksi tidak ditemukan', 404);
  return trx;
};

/**
 * Create a new transaction.
 *
 * data shape:
 * {
 *   type: 'CASH' | 'BON',
 *   customerName?, customerPhone?, notes?,
 *   discount?, tax?, paidAmount?,
 *   projectId?, unitLembagaId?, kepanitiaan?,
 *   items: [{ productId, quantity, price, discount?, unitId? }]
 * }
 */
const create = async (data, userId) => {
  const { items, ...header } = data;

  // Everything runs inside a single transaction with row-level locking
  // to prevent race conditions on stock checks & deductions.
  const transaction = await prisma.$transaction(async (tx) => {
    // ── 1. Lock & fetch products using SELECT ... FOR UPDATE ──
    const productIds = [...new Set(items.map((i) => i.productId))];

    // Step 1a: Lock product rows (FOR UPDATE not allowed with GROUP BY)
    await tx.$queryRaw`SELECT id FROM "products" WHERE id IN (${Prisma.join(productIds)}) FOR UPDATE`;

    // Step 1b: Fetch products with units (rows are now locked)
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      include: { productUnits: true },
    });

    const productMap = {};
    for (const p of products) {
      productMap[p.id] = p;
    }

    // ── 2. Validate stock & calculate totals ──
    let subtotal = 0;
    const processedItems = [];
    // Track remaining stock per product for duplicate product validation
    const remainingStock = {};
    for (const p of products) {
      remainingStock[p.id] = p.stock;
    }

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) {
        throw new AppError(`Produk tidak ditemukan: ${item.productId}`, 404);
      }

      // Convert quantity to base unit if a non-base unit is selected
      let qty = item.quantity;
      if (item.unitId) {
        const pu = product.productUnits.find(
          (u) => u.unitId === item.unitId && !u.isBaseUnit
        );
        if (pu) qty = Math.round(item.quantity * Number(pu.conversionFactor));
      }

      if (remainingStock[item.productId] - qty < 0) {
        throw new AppError(`Stok ${product.name} tidak mencukupi (tersisa ${remainingStock[item.productId]})`, 400);
      }
      remainingStock[item.productId] -= qty;

      const itemDiscount = item.discount || 0;
      const itemSubtotal = item.quantity * item.price - itemDiscount;
      subtotal += itemSubtotal;
      processedItems.push({ ...item, discount: itemDiscount, subtotal: itemSubtotal, baseQty: qty });
    }

    const discount = Math.min(Math.max(header.discount || 0, 0), subtotal);
    const tax = header.tax || 0;
    const total = subtotal - discount + tax;
    const paidAmount = header.paidAmount || 0;
    const changeAmount = paidAmount > total ? paidAmount - total : 0;

    // ── 3. Write transaction data ──
    const transactionNumber = await generateTransactionNumber(tx);

    const created = await tx.transaction.create({
      data: {
        transactionNumber,
        type: header.type,
        status: 'COMPLETED',
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
        paidAt: new Date(),
        projectId: header.projectId || null,
        unitLembagaId: header.unitLembagaId || null,
        kepanitiaan: header.kepanitiaan || null,
        createdBy: userId,
      },
    });

    await tx.transactionItem.createMany({
      data: processedItems.map((item) => ({
        transactionId: created.id,
        productId: item.productId,
        unitId: item.unitId || null,
        quantity: item.quantity,
        baseQty: item.baseQty,
        price: item.price,
        discount: item.discount,
        subtotal: item.subtotal,
      })),
    });

    // ── 4. Deduct stock (data already locked, safe from race condition) ──
    for (const item of processedItems) {
      const product = productMap[item.productId];
      const newStock = product.stock - item.baseQty;

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'OUT',
          quantity: item.baseQty,
          previousStock: product.stock,
          newStock,
          referenceType: 'TRANSACTION',
          referenceId: created.id,
          notes: 'Penjualan transaksi',
          createdBy: userId,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: newStock },
      });

      // Update local map for duplicate products in same transaction
      product.stock = newStock;
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
  }, { timeout: 30000 });

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

  // If BON, create in-app notification for admins (fire-and-forget)
  if (data.type === 'BON') {
    sendBonNotification(transaction).catch((err) => logger.error('BON notification failed:', err.message));
  }

  // Send Telegram notification (fire-and-forget)
  sendTransactionNotification(transaction).catch((err) => logger.error('Telegram notification failed:', err.message));

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

  if (!existing) throw new AppError('Transaksi tidak ditemukan', 404);
  if (existing.status === 'CANCELLED') {
    throw new AppError('Transaksi sudah dibatalkan sebelumnya', 400);
  }

  const transaction = await prisma.$transaction(async (tx) => {
    // Restore stock for every item using baseQty (already converted to base unit)
    for (const item of existing.items) {
      // Use baseQty if available (new transactions), fallback to quantity (old data)
      const restoreQty = item.baseQty || item.quantity;

      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const newStock = product.stock + restoreQty;

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'IN',
          quantity: restoreQty,
          previousStock: product.stock,
          newStock,
          referenceType: 'TRANSACTION',
          referenceId: id,
          notes: 'Pembatalan transaksi',
          createdBy: userId,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: newStock },
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
  }, { timeout: 30000 });

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
    if (endDate) {
      const end = new Date(endDate);
      if (!String(endDate).includes('T')) end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
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

// ─── In-app notification ─────────────────────────────────────────────

/**
 * Create in-app notification about a BON transaction for admins.
 */
const sendBonNotification = async (transaction) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: 'Transaksi Overbooking TU Baru',
        message: `Transaksi Overbooking TU ${transaction.transactionNumber} sebesar Rp ${Number(transaction.total).toLocaleString('id-ID')} oleh ${transaction.customerName || 'pelanggan'}.`,
        type: 'TRANSACTION_BON',
        status: 'PENDING',
      })),
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  cancel,
  getByUnitLembaga,
};
