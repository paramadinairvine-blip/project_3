export const formatRupiah = (number) => {
  if (number === null || number === undefined) return 'Rp 0';
  const num = typeof number === 'string' ? parseFloat(number) : number;
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
};

export const parseRupiah = (str) => {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9,-]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};
