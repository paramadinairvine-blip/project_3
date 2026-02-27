const { PrismaClient } = require('@prisma/client');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');
const { createLog, ACTION_TYPES } = require('./auditLog.service');
const { format } = require('date-fns');

const prisma = new PrismaClient();

/**
 * Get the current stock of a product (or a specific variant).
 * Stock is read directly from the Product / ProductVariant record
 * which is kept in sync by addMovement.
 */
const getCurrentStock = async (productId, variantId = null) => {
  if (variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, name: true, stock: true, sku: true },
    });
    if (!variant) {
      throw Object.assign(new Error('Varian produk tidak ditemukan'), { status: 404 });
    }
    return variant;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      minStock: true,
      maxStock: true,
      unit: true,
      variants: { select: { id: true, name: true, sku: true, stock: true } },
    },
  });

  if (!product) {
    throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });
  }

  return product;
};

/**
 * List all product stock with pagination.
 * Optionally filter to only low-stock items (stock < minStock).
 */
const getAllStock = async ({ page = 1, limit = DEFAULT_PAGE_SIZE, categoryId, lowStock = false } = {}) => {
  const where = { isActive: true };

  if (categoryId) {
    where.categoryId = categoryId;
  }

  // For lowStock we need a raw condition: stock < minStock
  // Prisma doesn't support field-to-field comparison directly,
  // so we fetch and filter in-app, or use rawFilter trick.
  const skip = (page - 1) * limit;

  if (lowStock) {
    // Use raw query for field comparison
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM products
      WHERE "isActive" = true
        AND stock < "minStock"
        ${categoryId ? prisma.$queryRaw`AND "categoryId" = ${categoryId}` : prisma.$queryRaw``}
    `;

    const products = await prisma.product.findMany({
      where: {
        ...where,
        // We'll do post-filter since Prisma lacks field comparison
      },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        unitOfMeasure: { select: { id: true, name: true, abbreviation: true } },
        variants: { select: { id: true, name: true, sku: true, stock: true } },
      },
      orderBy: { stock: 'asc' },
    });

    // Filter in-memory: stock < minStock
    const filtered = products.filter((p) => p.stock < p.minStock);
    const total = filtered.length;
    const data = filtered.slice(skip, skip + limit);

    return { data, total, page, limit };
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        unitOfMeasure: { select: { id: true, name: true, abbreviation: true } },
        variants: { select: { id: true, name: true, sku: true, stock: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Add a stock movement and update the product's stock accordingly.
 *
 * MovementType behaviour:
 *   IN         → stock += quantity
 *   OUT        → stock -= quantity
 *   ADJUSTMENT → stock is SET to quantity (delta recorded)
 *   OPNAME     → stock is SET to quantity (delta recorded)
 */
const addMovement = async ({ productId, variantId, unitId, quantity, movementType, referenceType, referenceId, notes, userId }) => {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });
    }

    // Convert quantity to base unit if unitId differs
    let convertedQty = quantity;
    if (unitId && product.unitId && unitId !== product.unitId) {
      const productUnit = await tx.productUnit.findUnique({
        where: { productId_unitId: { productId, unitId } },
      });
      if (productUnit) {
        convertedQty = Math.round(quantity * Number(productUnit.conversionFactor));
      }
    }

    const previousStock = product.stock;
    let newStock;

    switch (movementType) {
      case 'IN':
        newStock = previousStock + convertedQty;
        break;
      case 'OUT':
        newStock = previousStock - convertedQty;
        if (newStock < 0) {
          throw Object.assign(new Error('Stok tidak mencukupi'), { status: 400 });
        }
        break;
      case 'ADJUSTMENT':
      case 'OPNAME':
        // quantity = the new absolute stock value; we record the delta
        newStock = convertedQty;
        break;
      default:
        throw Object.assign(new Error('Tipe pergerakan stok tidak valid'), { status: 400 });
    }

    // Record the movement
    const movement = await tx.stockMovement.create({
      data: {
        productId,
        type: movementType,
        quantity: movementType === 'ADJUSTMENT' || movementType === 'OPNAME'
          ? convertedQty - previousStock
          : convertedQty,
        previousStock,
        newStock,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        notes: notes || null,
        createdBy: userId,
      },
    });

    // Update product stock
    await tx.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    // Also update variant stock if specified
    if (variantId) {
      const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
      if (variant) {
        let variantNewStock;
        switch (movementType) {
          case 'IN':
            variantNewStock = variant.stock + convertedQty;
            break;
          case 'OUT':
            variantNewStock = variant.stock - convertedQty;
            break;
          case 'ADJUSTMENT':
          case 'OPNAME':
            variantNewStock = convertedQty;
            break;
        }
        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: variantNewStock },
        });
      }
    }

    return movement;
  });
};

/**
 * Manually adjust stock (shortcut for addMovement with ADJUSTMENT type).
 */
const adjustStock = async ({ productId, variantId, unitId, quantity, notes, userId }) => {
  const movement = await addMovement({
    productId,
    variantId,
    unitId,
    quantity,
    movementType: 'ADJUSTMENT',
    referenceType: 'MANUAL',
    notes: notes || 'Penyesuaian stok manual',
    userId,
  });

  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'stock_movements',
    recordId: movement.id,
    newData: movement,
  });

  return movement;
};

/**
 * Check all products whose stock is below their minStock threshold.
 */
const checkLowStock = async () => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      minStock: true,
      unit: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: { stock: 'asc' },
  });

  return products.filter((p) => p.stock < p.minStock);
};

/**
 * Get stock movement history for a product within an optional date range.
 */
const getStockHistory = async (productId, { startDate, endDate, page = 1, limit = DEFAULT_PAGE_SIZE } = {}) => {
  const where = { productId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        creator: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Create a new stock opname session.
 * Snapshots every active product's current system stock.
 */
const createOpname = async (userId) => {
  const opnameNumber = `OPN-${format(new Date(), 'yyyyMMdd-HHmmss')}`;

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, stock: true },
  });

  const opname = await prisma.$transaction(async (tx) => {
    const created = await tx.stockOpname.create({
      data: {
        opnameNumber,
        status: 'DRAFT',
        createdBy: userId,
      },
    });

    // Batch create all items at once (prevents transaction timeout)
    if (products.length > 0) {
      await tx.stockOpnameItem.createMany({
        data: products.map((p) => ({
          stockOpnameId: created.id,
          productId: p.id,
          systemStock: p.stock,
          actualStock: p.stock,
          difference: 0,
        })),
      });
    }

    return tx.stockOpname.findUnique({
      where: { id: created.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
      },
    });
  }, { timeout: 30000 });

  await createLog({
    userId,
    action: ACTION_TYPES.CREATE,
    tableName: 'stock_opnames',
    recordId: opname.id,
    newData: { opnameNumber, productCount: products.length },
  });

  return opname;
};

/**
 * Update the actual quantity for a single opname item.
 */
const updateOpnameItem = async (opnameId, itemId, actualQty) => {
  const opname = await prisma.stockOpname.findUnique({ where: { id: opnameId } });
  if (!opname) {
    throw Object.assign(new Error('Sesi opname tidak ditemukan'), { status: 404 });
  }
  if (opname.status === 'COMPLETED') {
    throw Object.assign(new Error('Sesi opname sudah selesai, tidak bisa diubah'), { status: 400 });
  }

  const item = await prisma.stockOpnameItem.findUnique({ where: { id: itemId } });
  if (!item || item.stockOpnameId !== opnameId) {
    throw Object.assign(new Error('Item opname tidak ditemukan'), { status: 404 });
  }

  const difference = actualQty - item.systemStock;

  const updated = await prisma.stockOpnameItem.update({
    where: { id: itemId },
    data: { actualStock: actualQty, difference },
  });

  return updated;
};

/**
 * Complete an opname session.
 * For every item with a difference, creates an OPNAME stock movement
 * and updates the product stock.
 */
const completeOpname = async (opnameId, userId) => {
  const opname = await prisma.stockOpname.findUnique({
    where: { id: opnameId },
    include: { items: true },
  });

  if (!opname) {
    throw Object.assign(new Error('Sesi opname tidak ditemukan'), { status: 404 });
  }
  if (opname.status === 'COMPLETED') {
    throw Object.assign(new Error('Sesi opname sudah selesai'), { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    // Process each item that has a difference
    const adjustments = [];
    for (const item of opname.items) {
      if (item.difference !== 0) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });

        const movement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OPNAME',
            quantity: item.difference,
            previousStock: product.stock,
            newStock: item.actualStock,
            referenceType: 'OPNAME',
            referenceId: opnameId,
            notes: `Stock opname ${opname.opnameNumber}: selisih ${item.difference > 0 ? '+' : ''}${item.difference}`,
            createdBy: userId,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: item.actualStock },
        });

        adjustments.push(movement);
      }
    }

    // Mark opname as completed
    const completed = await tx.stockOpname.update({
      where: { id: opnameId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedBy: userId,
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    return { opname: completed, adjustments };
  });

  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'stock_opnames',
    recordId: opnameId,
    newData: {
      status: 'COMPLETED',
      adjustmentsCount: result.adjustments.length,
    },
  });

  return result;
};

module.exports = {
  getCurrentStock,
  getAllStock,
  addMovement,
  adjustStock,
  checkLowStock,
  getStockHistory,
  createOpname,
  updateOpnameItem,
  completeOpname,
};
