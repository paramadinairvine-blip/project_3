# Panduan Deploy — Supabase + Railway + Vercel

## Arsitektur

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Vercel     │ API  │   Railway    │  DB  │  Supabase    │
│  (Frontend)  │─────▶│  (Backend)   │─────▶│ (PostgreSQL) │
│  React+Vite  │      │  Express+    │      │  + Storage   │
│  Free CDN    │      │  Prisma      │      │  Free 500MB  │
└──────────────┘      └──────────────┘      └──────────────┘
```

---

## Step 1: Setup Supabase (Database + Storage)

1. Buka https://supabase.com → **New Project**
2. Pilih region **Southeast Asia (Singapore)**
3. Catat password database
4. Setelah project dibuat, ambil connection strings:
   - Buka **Settings → Database → Connection string**
   - Copy **URI** (Transaction mode / port 6543) → ini `DATABASE_URL`
   - Copy **URI** (Session mode / port 5432) → ini `DIRECT_URL`

5. Buat Storage Bucket:
   - Buka **Storage → New Bucket**
   - Nama: `product-images`
   - Centang **Public bucket**
   - Klik **Create**

6. Set Storage Policy:
   - Klik bucket `product-images` → **Policies**
   - Klik **New Policy** → **For full customization**
   - Policy name: `Allow public read`
   - Allowed operation: `SELECT`
   - Target roles: `anon`
   - Klik **Review** → **Save**

7. Ambil API Keys:
   - Buka **Settings → API**
   - Copy `URL` → ini `SUPABASE_URL`
   - Copy `service_role key` (bukan anon!) → ini `SUPABASE_SERVICE_KEY`

---

## Step 2: Deploy Backend ke Railway

1. Buka https://railway.app → Login dengan GitHub
2. **New Project → Deploy from GitHub repo**
3. Pilih repository kamu
4. Set **Root Directory**: `deploy/backend` (atau `/backend` jika repo terpisah)
5. Railway akan auto-detect Node.js

6. Tambah **Environment Variables** di Railway:
   ```
   PORT=5000
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.[ref]:[pass]@aws-0-ap-southeast-1.supabase.com:5432/postgres
   JWT_SECRET=(generate random string 32+ karakter)
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   CORS_ORIGINS=https://nama-app.vercel.app
   SUPABASE_URL=https://[ref].supabase.co
   SUPABASE_SERVICE_KEY=eyJ...
   ```

7. Railway akan auto-deploy. Catat URL: `https://xxx.up.railway.app`

8. Test: buka `https://xxx.up.railway.app/api/health`

---

## Step 3: Seed Database (Pertama Kali)

Buka Railway → **Service → Terminal**, lalu jalankan:
```bash
npx prisma db seed
```

Ini akan membuat user admin default:
- Email: `admin@pesantren.id`
- Password: `admin123`
- **GANTI PASSWORD SEGERA setelah login pertama!**

---

## Step 4: Deploy Frontend ke Vercel

1. Buka https://vercel.com → Login dengan GitHub
2. **Import Project** → pilih repository
3. Set:
   - **Root Directory**: `deploy/frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. Tambah **Environment Variables**:
   ```
   VITE_API_URL=https://xxx.up.railway.app/api
   ```

5. Deploy → catat URL: `https://nama-app.vercel.app`

---

## Step 5: Update CORS di Railway

Setelah dapat URL Vercel, update env di Railway:
```
CORS_ORIGINS=https://nama-app.vercel.app
```

Kalau pakai custom domain juga:
```
CORS_ORIGINS=https://nama-app.vercel.app,https://yourdomain.com
```

---

## Step 6: Test

1. Buka `https://nama-app.vercel.app`
2. Login dengan `admin@pesantren.id` / `admin123`
3. Test CRUD produk, upload gambar
4. Cek gambar terupload di Supabase Storage

---

## Generate JWT Secret

Jalankan di terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Free Tier Limits

| Platform | Limit |
|----------|-------|
| Supabase | 500MB database, 1GB storage, 2GB bandwidth/bulan |
| Railway | $5 credit/bulan, auto sleep saat idle |
| Vercel | 100GB bandwidth, auto SSL, unlimited deploy |

---

## Troubleshooting

### Backend tidak bisa connect ke database
- Cek `DATABASE_URL` format: harus pakai `?pgbouncer=true` di port 6543
- Cek `DIRECT_URL`: harus port 5432 tanpa pgbouncer

### CORS error di browser
- Pastikan `CORS_ORIGINS` di Railway cocok PERSIS dengan URL Vercel
- Jangan ada trailing slash (salah: `https://app.vercel.app/`, benar: `https://app.vercel.app`)

### Upload gambar gagal
- Cek bucket `product-images` sudah dibuat dan public
- Cek `SUPABASE_SERVICE_KEY` (bukan anon key)

### Railway sleep / cold start lambat
- Free tier Railway auto-sleep setelah idle. Cold start ~10-30 detik
- Upgrade ke $5/bulan untuk always-on
