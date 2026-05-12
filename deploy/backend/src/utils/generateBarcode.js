const { format } = require('date-fns');

/**
 * Generate a unique barcode string.
 * Format: TMP-[KATEGORI_CODE]-[YYYYMMDD]-[RANDOM4DIGIT]
 * Example: TMP-SMN-20240115-4829
 *
 * @param {string} categoryCode - Short uppercase code for the category (e.g. "SMN", "BSI")
 * @returns {string} Generated barcode
 */
const generateBarcode = (categoryCode = 'GEN') => {
  const code = categoryCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  const datePart = format(new Date(), 'yyyyMMdd');
  const random = String(Math.floor(1000 + Math.random() * 9000));

  return `TMP-${code}-${datePart}-${random}`;
};

module.exports = { generateBarcode };
