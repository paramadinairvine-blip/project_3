import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const formatTanggal = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy');
};

export const formatTanggalWaktu = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy HH:mm');
};

export const formatTanggalPanjang = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'd MMMM yyyy', { locale: id });
};

export const formatWaktu = (date) => {
  if (!date) return '-';
  return format(new Date(date), 'HH:mm');
};

/**
 * Konversi tanggal YYYY-MM-DD ke ISO string dengan timezone WIB (UTC+7)
 * startOfDayWIB('2026-03-04') → '2026-03-03T17:00:00.000Z' (00:00 WIB dalam UTC)
 * endOfDayWIB('2026-03-04')   → '2026-03-04T16:59:59.999Z' (23:59 WIB dalam UTC)
 */
export const startOfDayWIB = (dateStr) => {
  return new Date(dateStr + 'T00:00:00+07:00').toISOString();
};

export const endOfDayWIB = (dateStr) => {
  return new Date(dateStr + 'T23:59:59.999+07:00').toISOString();
};

export const startOfMonthWIB = (year, month) => {
  const m = String(month + 1).padStart(2, '0');
  return new Date(`${year}-${m}-01T00:00:00+07:00`).toISOString();
};

export const endOfMonthWIB = (year, month) => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const m = String(month + 1).padStart(2, '0');
  const d = String(lastDay).padStart(2, '0');
  return new Date(`${year}-${m}-${d}T23:59:59.999+07:00`).toISOString();
};
