export function getErrorMessage(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (!error) return fallback;

  if (!error.response) {
    return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
  }

  const status = error.response.status;
  const serverMessage = error.response.data?.message;

  switch (status) {
    case 401:
      return 'Sesi Anda telah berakhir. Silakan login kembali.';
    case 403:
      return 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.';
    case 404:
      return serverMessage || 'Data tidak ditemukan.';
    case 422:
      return serverMessage || 'Data yang dikirim tidak valid.';
    default:
      if (status >= 500) {
        return 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
      }
      return serverMessage || fallback;
  }
}
