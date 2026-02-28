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
