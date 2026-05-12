const prisma = require('../config/database');
const { generateBarcode } = require('../utils/generateBarcode');

/**
 * Regex for valid barcode formats.
 * Accepts:
 *   - TMP-XXX-YYYYMMDD-NNNN  (generated barcodes)
 *   - Numeric EAN-8 / EAN-13  (commercial barcodes)
 */
const BARCODE_PATTERN = /^(TMP-[A-Z0-9]{1,5}-\d{8}-\d{4}|\d{8}|\d{13})$/;

/**
 * Generate a unique barcode for a given category code.
 * Retries up to 5 times if the generated barcode already exists.
 *
 * @param {string} categoryCode - Short category code (e.g. "SMN", "BSI")
 * @returns {Promise<string>} A unique barcode string
 */
const generate = async (categoryCode = 'GEN') => {
  const MAX_RETRIES = 5;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const barcode = generateBarcode(categoryCode);

    // Check uniqueness against products and variants
    const [productExists, variantExists] = await Promise.all([
      prisma.product.findUnique({ where: { barcode }, select: { id: true } }),
      prisma.productVariant.findUnique({ where: { barcode }, select: { id: true } }),
    ]);

    if (!productExists && !variantExists) {
      return barcode;
    }
  }

  throw Object.assign(
    new Error('Gagal membuat barcode unik, silakan coba lagi'),
    { status: 500 }
  );
};

/**
 * Validate whether a barcode string has a valid format.
 *
 * @param {string} barcode
 * @returns {{ valid: boolean, format: string|null, message: string }}
 */
const validate = (barcode) => {
  if (!barcode || typeof barcode !== 'string') {
    return { valid: false, format: null, message: 'Barcode tidak boleh kosong' };
  }

  const trimmed = barcode.trim();

  if (trimmed.startsWith('TMP-')) {
    const isValid = /^TMP-[A-Z0-9]{1,5}-\d{8}-\d{4}$/.test(trimmed);
    return {
      valid: isValid,
      format: isValid ? 'INTERNAL' : null,
      message: isValid ? 'Format barcode internal valid' : 'Format barcode internal tidak valid (TMP-XXX-YYYYMMDD-NNNN)',
    };
  }

  if (/^\d{8}$/.test(trimmed)) {
    return { valid: true, format: 'EAN-8', message: 'Format EAN-8 valid' };
  }

  if (/^\d{13}$/.test(trimmed)) {
    return { valid: true, format: 'EAN-13', message: 'Format EAN-13 valid' };
  }

  // Accept any non-empty string as custom barcode
  if (trimmed.length >= 3 && trimmed.length <= 50) {
    return { valid: true, format: 'CUSTOM', message: 'Format barcode custom valid' };
  }

  return { valid: false, format: null, message: 'Format barcode tidak valid (min 3, max 50 karakter)' };
};

/**
 * Find a product by barcode.
 * Searches product barcodes first, then variant barcodes.
 *
 * @param {string} barcode
 * @returns {Promise<object>} Product with relations
 */
const getProductByBarcode = async (barcode) => {
  if (!barcode) {
    throw Object.assign(new Error('Barcode tidak boleh kosong'), { status: 400 });
  }

  // Search in products
  const product = await prisma.product.findUnique({
    where: { barcode },
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
      unitOfMeasure: { select: { id: true, name: true, abbreviation: true } },
      variants: { where: { isActive: true } },
    },
  });

  if (product) {
    return { source: 'product', data: product };
  }

  // Search in variants
  const variant = await prisma.productVariant.findUnique({
    where: { barcode },
    include: {
      product: {
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          unitOfMeasure: { select: { id: true, name: true, abbreviation: true } },
        },
      },
    },
  });

  if (variant) {
    return { source: 'variant', data: variant.product, matchedVariant: variant };
  }

  throw Object.assign(new Error('Produk dengan barcode tersebut tidak ditemukan'), { status: 404 });
};

/**
 * Generate and assign barcodes for multiple products at once.
 *
 * @param {string[]} productIds - Array of product IDs to generate barcodes for
 * @returns {Promise<object[]>} Array of { productId, barcode, status }
 */
const bulkGenerate = async (productIds) => {
  if (!productIds || productIds.length === 0) {
    throw Object.assign(new Error('Daftar produk tidak boleh kosong'), { status: 400 });
  }

  const results = [];

  for (const productId of productIds) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { category: { select: { name: true } } },
      });

      if (!product) {
        results.push({ productId, barcode: null, status: 'error', message: 'Produk tidak ditemukan' });
        continue;
      }

      if (product.barcode) {
        results.push({ productId, barcode: product.barcode, status: 'skipped', message: 'Sudah memiliki barcode' });
        continue;
      }

      const categoryCode = product.category ? product.category.name.substring(0, 3) : 'GEN';
      const barcode = await generate(categoryCode);

      await prisma.product.update({
        where: { id: productId },
        data: { barcode },
      });

      results.push({ productId, barcode, status: 'success', message: 'Barcode berhasil dibuat' });
    } catch (err) {
      results.push({ productId, barcode: null, status: 'error', message: err.message });
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return {
    results,
    summary: { total: productIds.length, success: successCount, skipped: skippedCount, error: errorCount },
  };
};

module.exports = {
  generate,
  validate,
  getProductByBarcode,
  bulkGenerate,
};
