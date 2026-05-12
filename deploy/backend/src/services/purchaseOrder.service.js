const prisma = require('../config/database');
const { format } = require('date-fns');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');
const { createLog, ACTION_TYPES } = require('./auditLog.service');

// ─── helpers ────────────────────────────────────────────────────────

const poIncludes = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, sku: true, barcode: true, unit: true, buyPrice: true },
      },
    },
  },
  supplier: { select: { id: true, name: true, contactName: true, phone: true } },
  creator: { select: { id: true, fullName: true, email: true } },
  updater: { select: { id: true, fullName: true } },
};

/**
 * Generate the next PO number for today.
 * Format: PO-YYYYMMDD-XXXX
 */
const generatePONumber = async (tx) => {
  const today = format(new Date(), 'yyyyMMdd');
  const prefix = `PO-${today}-`;

  const last = await tx.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
    select: { poNumber: true },
  });

  let seq = 1;
  if (last) {
    const lastSeq = parseInt(last.poNumber.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
};

// ─── public API ─────────────────────────────────────────────────────

/**
 * List purchase orders with filters and pagination.
 */
const getAll = async ({
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  status,
  supplierId,
  startDate,
  endDate,
} = {}) => {
  const where = {};

  if (status) where.status = status;
  if (supplierId) where.supplierId = supplierId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: poIncludes,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Get a single purchase order by ID with full relations.
 */
const getById = async (id) => {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: poIncludes,
  });

  if (!po) throw Object.assign(new Error('Purchase order tidak ditemukan'), { status: 404 });
  return po;
};

/**
 * Create a new purchase order.
 *
 * data shape:
 * {
 *   supplierId, notes?,
 *   items: [{ productId, quantity, price }]
 * }
 */
const create = async (data, userId) => {
  const { items, ...header } = data;

  const po = await prisma.$transaction(async (tx) => {
    const poNumber = await generatePONumber(tx);

    // Calculate totals
    let totalAmount = 0;
    const processedItems = items.map((item) => {
      const subtotal = item.quantity * item.price;
      totalAmount += subtotal;
      return { ...item, subtotal };
    });

    const created = await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: header.supplierId,
        status: 'DRAFT',
        notes: header.notes || null,
        totalAmount,
        orderDate: header.orderDate ? new Date(header.orderDate) : new Date(),
        createdBy: userId,
      },
    });

    for (const item of processedItems) {
      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: created.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal,
        },
      });
    }

    return tx.purchaseOrder.findUnique({
      where: { id: created.id },
      include: poIncludes,
    });
  });

  await createLog({
    userId,
    action: ACTION_TYPES.CREATE,
    tableName: 'purchase_orders',
    recordId: po.id,
    newData: { poNumber: po.poNumber, supplierId: po.supplierId, totalAmount: po.totalAmount, itemCount: items.length },
  });

  return po;
};

/**
 * Update a purchase order (only allowed when status is DRAFT).
 */
const update = async (id, data, userId) => {
  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!existing) throw Object.assign(new Error('Purchase order tidak ditemukan'), { status: 404 });
  if (existing.status !== 'DRAFT') {
    throw Object.assign(new Error('Hanya PO berstatus DRAFT yang dapat diubah'), { status: 400 });
  }

  const { items, ...header } = data;

  const po = await prisma.$transaction(async (tx) => {
    // Update header fields
    const updateData = {};
    if (header.supplierId) updateData.supplierId = header.supplierId;
    if (header.notes !== undefined) updateData.notes = header.notes;
    if (header.orderDate) updateData.orderDate = new Date(header.orderDate);
    updateData.updatedBy = userId;

    // Replace items if provided
    if (items !== undefined) {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });

      let totalAmount = 0;
      for (const item of items) {
        const subtotal = item.quantity * item.price;
        totalAmount += subtotal;
        await tx.purchaseOrderItem.create({
          data: {
            purchaseOrderId: id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            subtotal,
          },
        });
      }
      updateData.totalAmount = totalAmount;
    }

    await tx.purchaseOrder.update({ where: { id }, data: updateData });

    return tx.purchaseOrder.findUnique({
      where: { id },
      include: poIncludes,
    });
  });

  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'purchase_orders',
    recordId: id,
    oldData: existing,
    newData: po,
  });

  return po;
};

/**
 * Send a purchase order (change status DRAFT → SENT).
 */
const send = async (id, userId) => {
  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });

  if (!existing) throw Object.assign(new Error('Purchase order tidak ditemukan'), { status: 404 });
  if (existing.status !== 'DRAFT') {
    throw Object.assign(new Error('Hanya PO berstatus DRAFT yang dapat dikirim'), { status: 400 });
  }

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'SENT', updatedBy: userId },
    include: poIncludes,
  });

  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'purchase_orders',
    recordId: id,
    oldData: { status: 'DRAFT' },
    newData: { status: 'SENT' },
  });

  return po;
};

/**
 * Receive a purchase order.
 *
 * receivedItems shape:
 * [{ itemId, receivedQty }]
 *
 * Steps:
 *   1. Change status to RECEIVED
 *   2. Add stock for each item (StockMovement IN)
 *   3. Update buy price if PO price differs → record PriceHistory
 *   4. Create WA notification
 */
const receive = async (id, receivedItems, userId) => {
  const existing = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, supplier: true },
  });

  if (!existing) throw Object.assign(new Error('Purchase order tidak ditemukan'), { status: 404 });
  if (existing.status === 'RECEIVED') {
    throw Object.assign(new Error('Purchase order sudah diterima sebelumnya'), { status: 400 });
  }
  if (existing.status === 'CANCELLED') {
    throw Object.assign(new Error('Purchase order yang dibatalkan tidak dapat diterima'), { status: 400 });
  }

  // Build a map of itemId → receivedQty for fast lookup
  const receivedMap = new Map();
  if (receivedItems && receivedItems.length > 0) {
    for (const ri of receivedItems) {
      receivedMap.set(ri.itemId, ri.receivedQty);
    }
  }

  const po = await prisma.$transaction(async (tx) => {
    for (const item of existing.items) {
      const receivedQty = receivedMap.get(item.id) ?? item.quantity;

      // Update PO item receivedQty
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQty },
      });

      // Add stock (StockMovement IN)
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      const previousStock = product.stock;
      const newStock = previousStock + receivedQty;

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'IN',
          quantity: receivedQty,
          previousStock,
          newStock,
          referenceType: 'PO',
          referenceId: id,
          notes: `Penerimaan PO ${existing.poNumber}`,
          createdBy: userId,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: { stock: newStock },
      });

      // Check if buy price changed → record PriceHistory
      const poBuyPrice = Number(item.price);
      const currentBuyPrice = Number(product.buyPrice);

      if (poBuyPrice !== currentBuyPrice) {
        await tx.priceHistory.create({
          data: {
            productId: item.productId,
            oldBuy: product.buyPrice,
            newBuy: item.price,
            oldSell: product.sellPrice,
            newSell: product.sellPrice, // sell price unchanged
            changedBy: userId,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { buyPrice: item.price },
        });
      }
    }

    return tx.purchaseOrder.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedAt: new Date(),
        updatedBy: userId,
      },
      include: poIncludes,
    });
  });

  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'purchase_orders',
    recordId: id,
    oldData: { status: existing.status },
    newData: { status: 'RECEIVED', receivedItemCount: existing.items.length },
  });

  // WhatsApp notification (fire-and-forget)
  sendReceiveNotification(po).catch((err) =>
    console.error('[WA] Gagal kirim notifikasi penerimaan PO:', err.message)
  );

  return po;
};

/**
 * Cancel a purchase order (only DRAFT or SENT).
 */
const cancel = async (id, userId) => {
  const existing = await prisma.purchaseOrder.findUnique({ where: { id } });

  if (!existing) throw Object.assign(new Error('Purchase order tidak ditemukan'), { status: 404 });
  if (existing.status !== 'DRAFT' && existing.status !== 'SENT') {
    throw Object.assign(new Error('Hanya PO berstatus DRAFT atau SENT yang dapat dibatalkan'), { status: 400 });
  }

  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: 'CANCELLED', updatedBy: userId },
    include: poIncludes,
  });

  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'purchase_orders',
    recordId: id,
    oldData: { status: existing.status },
    newData: { status: 'CANCELLED' },
  });

  return po;
};

// ─── WhatsApp notification (stub) ───────────────────────────────────

const sendReceiveNotification = async (po) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true, fullName: true, phone: true },
  });

  for (const admin of admins) {
    if (!admin.phone) continue;

    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'Barang PO Diterima',
        message: `PO ${po.poNumber} dari ${po.supplier?.name || 'supplier'} telah diterima. Total: Rp ${Number(po.totalAmount).toLocaleString('id-ID')}.`,
        type: 'PO_RECEIVED',
        status: 'PENDING',
      },
    });

    // TODO: Send via whatsapp-web.js when WA service is configured
    console.log(`[WA] Notifikasi PO diterima → ${admin.fullName} (${admin.phone}): ${po.poNumber}`);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  send,
  receive,
  cancel,
};
