# Toko Material Pesantren — Web App

Sistem inventori dan manajemen stok material bangunan untuk pesantren. Mencakup pengelolaan produk, supplier, transaksi (tunai/bon/anggaran), purchase order, stok opname, proyek pembangunan, dan laporan.

## Prasyarat

- **Node.js** 20+ & npm
- **PostgreSQL** 16+ (atau Docker)

## Instalasi

### 1. Setup Database

**Opsi A — Docker (disarankan):**

```bash
docker-compose up -d
```

Ini akan menjalankan PostgreSQL 16 di port 5432 dengan database `toko_material`.

**Opsi B — PostgreSQL manual:**

Buat database baru:

```sql
CREATE DATABASE toko_material;
```

### 2. Konfigurasi Environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`, sesuaikan:

- `DATABASE_URL` — sesuaikan user, password, host, port, dan nama database
- `JWT_SECRET` — ganti dengan string random yang kuat

### 3. Install Dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Migrasi & Seed Database

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### 5. Build Frontend

```bash
cd frontend
npm run build
```

### 6. Jalankan Server

```bash
cd backend
npm start
```

Akses aplikasi di: **http://localhost:5000**

## Akun Default

| Email               | Password  | Role    |
| ------------------- | --------- | ------- |
| admin@pesantren.id  | admin123  | Admin   |

## Development Mode

Untuk development dengan hot-reload:

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173, proxy ke backend)
cd frontend && npm run dev
```

## Fitur

- **Dashboard** — ringkasan stok, transaksi terbaru, grafik tren
- **Produk & Kategori** — CRUD, barcode, varian, konversi satuan
- **Supplier & Purchase Order** — kelola supplier, buat PO, terima barang
- **Transaksi** — pengeluaran material (tunai/bon/anggaran), cetak nota/surat jalan/faktur
- **Stok** — overview, penyesuaian, opname stok dengan barcode scanner
- **Proyek** — tracking material per proyek pembangunan
- **Laporan** — stok, keuangan, tren (export PDF/Excel/cetak)
- **Pengguna** — manajemen user dengan role (Admin/Operator/Viewer)
- **Audit Log** — riwayat semua perubahan data, rollback

## Teknologi

| Layer    | Stack                                                      |
| -------- | ---------------------------------------------------------- |
| Frontend | React 19, Vite 7, Tailwind CSS 3, Zustand, React Query    |
| Backend  | Express 5, Prisma 6, PostgreSQL 16                         |
| Auth     | JWT (access + refresh token), role-based access control     |
| Export   | jsPDF, xlsx, react-to-print                                |
| Charts   | Recharts                                                   |

## Struktur Proyek

```
project_3/
├── backend/
│   ├── prisma/          # Schema, migrations, seed
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── middlewares/  # Auth, error handler, upload
│   │   ├── routes/       # API route definitions
│   │   ├── services/     # Business logic
│   │   └── index.js      # Entry point
│   └── uploads/          # File uploads
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios instance & endpoints
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── layouts/      # MainLayout, Sidebar, Topbar
│   │   ├── pages/        # Route pages
│   │   ├── stores/       # Zustand stores
│   │   └── utils/        # Helpers (format, export, etc)
│   └── dist/             # Production build output
├── docker-compose.yml
└── README.md
```
