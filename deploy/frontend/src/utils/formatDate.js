import { format } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format date: "21/02/2026"
 */
export const formatTanggal = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy');
};

/**
 * Format date with time: "21/02/2026 14:30"
 */
export const formatTanggalWaktu = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy HH:mm');
};

/**
 * Format long date: "21 Februari 2026"
 */
export const formatTanggalPanjang = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'd MMMM yyyy', { locale: id });
};
