// Service Worker - Online Only
// App hanya bisa digunakan dengan koneksi internet

const CACHE_NAME = 'toko-material-v1';

// Install - langsung aktifkan
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate - bersihkan cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

// Fetch - online only, tampilkan halaman offline jika tidak ada koneksi
self.addEventListener('fetch', (event) => {
  // Hanya handle navigasi (halaman HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tidak Ada Koneksi</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      color: #1f2937;
      margin-bottom: 8px;
    }
    p {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button:active { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#128268;</div>
    <h1>Tidak Ada Koneksi Internet</h1>
    <p>Aplikasi Toko Material membutuhkan koneksi internet untuk menampilkan data terbaru. Periksa koneksi internet Anda dan coba lagi.</p>
    <button onclick="window.location.reload()">Coba Lagi</button>
  </div>
</body>
</html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })
    );
    return;
  }

  // Request lainnya (API, assets) - langsung fetch, gagal ya gagal
  event.respondWith(fetch(event.request));
});
