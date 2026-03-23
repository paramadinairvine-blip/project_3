const prisma = require('../lib/prisma');
const { format } = require('date-fns');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');
const { createLog, ACTION_TYPES } = require('./auditLog.service');
const AppError = require('../utils/AppError');

// ─── helpers ────────────────────────────────────────────────────────

const returnIncludes = {
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
      transactionItem: { select: { id: true, quantity: true, baseQty: true } },
    },
  },
  transaction: {
    select: { id: true, transactionNumber: true, type: true, total: true, customerName: true, projectId: true },
  },
  creator: { select: { id: true, fullName: true } },
};

const generateReturnNumber = async (tx) => {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `RTN-${today}-`;

  const last = await tx.transactionReturn.findFirst({
    where: { returnNumber: { startsWith: prefix } },
    orderBy: { returnNumber: 'desc' },
    select: { returnNumber: true },
  });

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.returnNumber.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

// ─── public API ─────────────────────────────────────────────────────

const getAll = async ({ page = 1, limit = DEFAULT_PAGE_SIZE, search, startDate, endDate } = {}) => {
  const where = {};

  if (search) {
    where.OR = [
      { returnNumber: { contains: search, mode: 'insensitive' } },
      { transaction: { transactionNumber: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.transactionReturn.findMany({
      where,
      include: returnIncludes,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transactionReturn.count({ where }),
  ]);

  return { data, total, page, limit };
};

const getById = async (id) => {
  const ret = await prisma.transactionReturn.findUnique({
    where: { id },
    include: returnIncludes,
  });

  if (!ret) throw new AppError('Data retur tidak ditemukan', 404);
  return ret;
};

const getByTransactionId = async (transactionId) => {
  return prisma.transactionReturn.findMany({
    where: { transactionId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
      creator: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Create a return for a transaction.
 *
 * data shape:
 * {
 *   transactionId: string,
 *   reason?: string,
 *   items: [{ transactionItemId: string, quantity: number }]
 * }
 */
const create = async (data, userId) => {
  const { transactionId, reason, items } = data;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch transaction with items
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { items: true },
    });

    if (!transaction) throw new AppError('Transaksi tidak ditemukan', 404);
    if (transaction.status !== 'COMPLETED') {
      throw new AppError('Hanya transaksi COMPLETED yang bisa diretur', 400);
    }

    // 2. Get already-returned quantities per transaction item
    const existingReturns = await tx.transactionReturnItem.groupBy({
      by: ['transactionItemId'],
      where: { transactionReturn: { transactionId } },
      _sum: { quantity: true },
    });

    const returnedMap = {};
    for (const r of existingReturns) {
      returnedMap[r.transactionItemId] = r._sum.quantity || 0;
    }

    // 3. Build item map
    const itemMap = {};
    for (const item of transaction.items) {
      itemMap[item.id] = item;
    }

    // 4. Validate and process return items
    let refundAmount = 0;
    const processedItems = [];

    for (const ri of items) {
      const originalItem = itemMap[ri.transactionItemId];
      if (!originalItem) {
        throw new AppError(`Item transaksi ${ri.transactionItemId} tidak ditemukan`, 400);
      }

      const alreadyReturned = returnedMap[ri.transactionItemId] || 0;
      const maxReturnable = originalItem.quantity - alreadyReturned;

      if (ri.quantity > maxReturnable) {
        throw new AppError(
          `Jumlah retur melebihi sisa yang bisa diretur (maks: ${maxReturnable})`,
          400
        );
      }

      // Calculate baseQty proportionally
      const baseQty = originalItem.baseQty > 0 && originalItem.quantity > 0
        ? Math.round(ri.quantity * (originalItem.baseQty / originalItem.quantity))
        : ri.quantity;

      const price = Number(originalItem.price);
      const subtotal = ri.quantity * price;
      refundAmount += subtotal;

      processedItems.push({
        transactionItemId: ri.transactionItemId,
        productId: originalItem.productId,
        quantity: ri.quantity,
        baseQty,
        price: originalItem.price,
        subtotal,
      });
    }

    // 5. Generate return number
    const returnNumber = await generateReturnNumber(tx);

    // 6. Create TransactionReturn
    const created = await tx.transactionReturn.create({
      data: {
        returnNumber,
        transactionId,
        reason: reason || null,
        refundAmount,
        createdBy: userId,
      },
    });

    // 7. Create return items
    await tx.transactionReturnItem.createMany({
      data: processedItems.map((item) => ({
        transactionReturnId: created.id,
        transactionItemId: item.transactionItemId,
        productId: item.productId,
        quantity: item.quantity,
        baseQty: item.baseQty,
        price: item.price,
        subtotal: item.subtotal,
      })),
    });

    // 8. Restore stock for each item
    for (const item of processedItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const newStock = product.stock + item.baseQty;

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'IN',
          quantity: item.baseQty,
          previousStock: product.stock,
          newStock,
          referenceType: 'RETURN',
          referenceId: created.id,
          notes: `Retur transaksi ${returnNumber}`,
          createdBy: userId,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: newStock },
      });
    }

    // 9. Update project.spent if linked
    if (transaction.projectId) {
      await tx.project.update({
        where: { id: transaction.projectId },
        data: { spent: { decrement: refundAmount } },
      });
    }

    return tx.transactionReturn.findUnique({
      where: { id: created.id },
      include: returnIncludes,
    });
  }, { timeout: 30000 });

  // 10. Audit log
  await createLog({
    userId,
    action: ACTION_TYPES.CREATE,
    tableName: 'transaction_returns',
    recordId: result.id,
    newData: {
      returnNumber: result.returnNumber,
      transactionId,
      refundAmount: result.refundAmount,
      itemCount: items.length,
    },
  });

  return result;
};

module.exports = {
  getAll,
  getById,
  getByTransactionId,
  create,
};
