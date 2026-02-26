const prisma = require('../config/database');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');
const { generateBarcode } = require('../utils/generateBarcode');
const { createLog, ACTION_TYPES } = require('./auditLog.service');

// Shared include for product queries
const productIncludes = {
  category: { select: { id: true, name: true, parentId: true } },
  brand: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  unitOfMeasure: { select: { id: true, name: true, abbreviation: true } },
  variants: true,
  productUnits: {
    include: { unit: { select: { id: true, name: true, abbreviation: true } } },
  },
  priceHistories: {
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { id: true, fullName: true } } },
  },
};

/**
 * List products with pagination, search and filters.
 */
const getAll = async ({ page = 1, limit = DEFAULT_PAGE_SIZE, search, categoryId, brandId, isActive } = {}) => {
  const where = {};

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (brandId) {
    where.brandId = brandId;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        unitOfMeasure: { select: { id: true, name: true, abbreviation: true } },
        variants: { where: { isActive: true } },
        productUnits: {
          include: { unit: { select: { id: true, name: true, abbreviation: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { data, total, page, limit };
};

/**
 * Get a single product with all relations, current stock, and price history.
 */
const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productIncludes,
  });

  if (!product) {
    throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });
  }

  return product;
};

/**
 * Create a new product with optional variants and unit conversions.
 * Auto-generates barcode if not provided.
 */
const create = async (data, userId) => {
  const { variants, units, ...productData } = data;

  // Auto-generate barcode if not provided
  if (!productData.barcode) {
    let categoryCode = 'GEN';
    if (productData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: productData.categoryId },
      });
      if (category) {
        categoryCode = category.name.substring(0, 3);
      }
    }
    productData.barcode = generateBarcode(categoryCode);
  }

  const product = await prisma.$transaction(async (tx) => {
    // Create the product
    const created = await tx.product.create({
      data: {
        ...productData,
        createdBy: userId,
      },
    });

    // Create variants if provided
    if (variants && variants.length > 0) {
      for (const v of variants) {
        await tx.productVariant.create({
          data: {
            productId: created.id,
            name: v.name,
            sku: v.sku,
            barcode: v.barcode || null,
            buyPrice: v.buyPrice || 0,
            sellPrice: v.sellPrice || 0,
            stock: v.stock || 0,
          },
        });
      }
    }

    // Create unit conversions if provided
    if (units && units.length > 0) {
      for (const u of units) {
        await tx.productUnit.create({
          data: {
            productId: created.id,
            unitId: u.unitId,
            conversionFactor: u.conversionFactor,
            isBaseUnit: u.isBaseUnit || false,
          },
        });
      }
    }

    // Return complete product
    return tx.product.findUnique({
      where: { id: created.id },
      include: productIncludes,
    });
  });

  // Audit log (outside transaction for non-critical logging)
  await createLog({
    userId,
    action: ACTION_TYPES.CREATE,
    tableName: 'products',
    recordId: product.id,
    newData: product,
  });

  return product;
};

/**
 * Update a product. Records price history if prices changed.
 */
const update = async (id, data, userId) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });
  }

  const { variants, units, ...productData } = data;

  const product = await prisma.$transaction(async (tx) => {
    // Check if prices changed → record history
    const buyChanged = productData.buyPrice !== undefined && Number(productData.buyPrice) !== Number(existing.buyPrice);
    const sellChanged = productData.sellPrice !== undefined && Number(productData.sellPrice) !== Number(existing.sellPrice);

    if (buyChanged || sellChanged) {
      await tx.priceHistory.create({
        data: {
          productId: id,
          oldBuy: existing.buyPrice,
          newBuy: productData.buyPrice !== undefined ? productData.buyPrice : existing.buyPrice,
          oldSell: existing.sellPrice,
          newSell: productData.sellPrice !== undefined ? productData.sellPrice : existing.sellPrice,
          changedBy: userId,
        },
      });
    }

    // Update the product
    await tx.product.update({
      where: { id },
      data: {
        ...productData,
        updatedBy: userId,
      },
    });

    // Replace variants if provided
    if (variants !== undefined) {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (variants.length > 0) {
        for (const v of variants) {
          await tx.productVariant.create({
            data: {
              productId: id,
              name: v.name,
              sku: v.sku,
              barcode: v.barcode || null,
              buyPrice: v.buyPrice || 0,
              sellPrice: v.sellPrice || 0,
              stock: v.stock || 0,
            },
          });
        }
      }
    }

    // Replace unit conversions if provided
    if (units !== undefined) {
      await tx.productUnit.deleteMany({ where: { productId: id } });
      if (units.length > 0) {
        for (const u of units) {
          await tx.productUnit.create({
            data: {
              productId: id,
              unitId: u.unitId,
              conversionFactor: u.conversionFactor,
              isBaseUnit: u.isBaseUnit || false,
            },
          });
        }
      }
    }

    return tx.product.findUnique({
      where: { id },
      include: productIncludes,
    });
  });

  // Audit log
  await createLog({
    userId,
    action: ACTION_TYPES.UPDATE,
    tableName: 'products',
    recordId: id,
    oldData: existing,
    newData: product,
  });

  return product;
};

/**
 * Soft-delete a product (set isActive = false).
 */
const remove = async (id, userId) => {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false, updatedBy: userId },
  });

  await createLog({
    userId,
    action: ACTION_TYPES.DELETE,
    tableName: 'products',
    recordId: id,
    oldData: existing,
  });

  return product;
};

/**
 * Find a product by barcode (exact match on product or variant barcode).
 */
const getByBarcode = async (barcode) => {
  // Try product barcode first
  let product = await prisma.product.findUnique({
    where: { barcode },
    include: productIncludes,
  });

  if (product) return product;

  // Try variant barcode
  const variant = await prisma.productVariant.findUnique({
    where: { barcode },
    include: {
      product: { include: productIncludes },
    },
  });

  if (variant) return { ...variant.product, matchedVariant: variant };

  throw Object.assign(new Error('Produk dengan barcode tersebut tidak ditemukan'), { status: 404 });
};

/**
 * Generate and assign a new barcode to a product.
 */
const generateProductBarcode = async (productId) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });

  if (!product) {
    throw Object.assign(new Error('Produk tidak ditemukan'), { status: 404 });
  }

  const categoryCode = product.category ? product.category.name.substring(0, 3) : 'GEN';
  const barcode = generateBarcode(categoryCode);

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { barcode },
  });

  return updated;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: remove,
  getByBarcode,
  generateProductBarcode,
};
