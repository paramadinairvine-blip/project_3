/**
 * End-to-End Flow Test
 *
 * 1. Buat 10 master produk
 * 2. PO semua produk dengan random qty, lalu receive
 * 3. Buat 15 transaksi dan 4 retur
 * 4. Check monitoring stock, laporan keuangan, laba rugi, tren, dashboard
 */

const BASE = 'http://localhost:5000/api';
let TOKEN = '';
let categoryId = '';
let supplierId = '';
let unitId = '';
const products = [];
const transactions = [];
const poId = '';
const errors = [];
let totalStockIn = {};   // productId -> total masuk
let totalStockOut = {};  // productId -> total keluar
let totalStockReturn = {}; // productId -> total retur

// ── Helpers ──
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok && res.status !== 422) {
    console.error(`  ERROR ${method} ${path}: ${res.status}`, data.message || '');
  }
  return { status: res.status, ...data };
}

function log(emoji, msg) { console.log(`${emoji}  ${msg}`); }
function pass(msg) { log('✅', msg); }
function fail(msg) { log('❌', msg); errors.push(msg); }
function info(msg) { log('📋', msg); }
function divider(title) { console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`); }

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ══════════════════════════════════════════════════
// STEP 0: LOGIN
// ══════════════════════════════════════════════════
async function login() {
  divider('STEP 0: LOGIN');
  const res = await api('POST', '/auth/login', { email: 'admin@pesantren.id', password: 'admin123' });
  if (res.success && res.data?.accessToken) {
    TOKEN = res.data.accessToken;
    pass(`Login berhasil sebagai ${res.data.user?.fullName || 'Admin'}`);
  } else {
    fail('Login GAGAL! Pastikan akun admin@pesantren.id ada.');
    process.exit(1);
  }
}

// ══════════════════════════════════════════════════
// STEP 0.5: SETUP (Kategori, Supplier, Unit)
// ══════════════════════════════════════════════════
async function setup() {
  divider('STEP 0.5: SETUP KATEGORI, SUPPLIER, UNIT');

  // Cek/buat kategori
  const cats = await api('GET', '/categories');
  if (cats.data?.length > 0) {
    categoryId = cats.data[0].id;
    info(`Menggunakan kategori existing: ${cats.data[0].name}`);
  } else {
    const cat = await api('POST', '/categories', { name: 'Bahan Bangunan' });
    categoryId = cat.data?.id;
    info('Kategori "Bahan Bangunan" dibuat');
  }

  // Cek/buat supplier
  const sups = await api('GET', '/suppliers');
  if (sups.data?.length > 0) {
    supplierId = sups.data[0].id;
    info(`Menggunakan supplier existing: ${sups.data[0].name}`);
  } else {
    const sup = await api('POST', '/suppliers', { name: 'PT Test Supplier', phone: '08123456789' });
    supplierId = sup.data?.id;
    info('Supplier "PT Test Supplier" dibuat');
  }

  // Cek/buat unit
  const units = await api('GET', '/units/measures');
  if (units.data?.length > 0) {
    unitId = units.data[0].id;
    info(`Menggunakan unit existing: ${units.data[0].name}`);
  } else {
    const unit = await api('POST', '/units/measures', { name: 'Piece', abbreviation: 'pcs' });
    unitId = unit.data?.id;
    info('Unit "pcs" dibuat');
  }

  if (!categoryId || !supplierId || !unitId) {
    fail('Setup gagal: kategori/supplier/unit tidak tersedia');
    process.exit(1);
  }
  pass('Setup selesai');
}

// ══════════════════════════════════════════════════
// STEP 1: BUAT 10 MASTER PRODUK
// ══════════════════════════════════════════════════
async function createProducts() {
  divider('STEP 1: BUAT 10 MASTER PRODUK');

  const productData = [
    { name: '[TEST] Semen Portland', buyPrice: 55000, sellPrice: 65000 },
    { name: '[TEST] Pasir Halus', buyPrice: 80000, sellPrice: 95000 },
    { name: '[TEST] Batu Bata Merah', buyPrice: 500, sellPrice: 700 },
    { name: '[TEST] Besi Beton 10mm', buyPrice: 75000, sellPrice: 90000 },
    { name: '[TEST] Cat Tembok Putih', buyPrice: 45000, sellPrice: 58000 },
    { name: '[TEST] Paku 5cm', buyPrice: 15000, sellPrice: 20000 },
    { name: '[TEST] Kawat Bendrat', buyPrice: 12000, sellPrice: 16000 },
    { name: '[TEST] Triplek 3mm', buyPrice: 35000, sellPrice: 45000 },
    { name: '[TEST] Pipa PVC 3/4', buyPrice: 18000, sellPrice: 25000 },
    { name: '[TEST] Keramik 40x40', buyPrice: 42000, sellPrice: 55000 },
  ];

  for (const p of productData) {
    const res = await api('POST', '/products', {
      name: p.name,
      categoryId,
      unitId,
      buyPrice: p.buyPrice,
      sellPrice: p.sellPrice,
      minStock: 10,
      maxStock: 1000,
    });

    if (res.success && res.data) {
      products.push({ ...res.data, buyPrice: p.buyPrice, sellPrice: p.sellPrice });
      totalStockIn[res.data.id] = 0;
      totalStockOut[res.data.id] = 0;
      totalStockReturn[res.data.id] = 0;
      pass(`Produk dibuat: ${p.name} (beli: ${p.buyPrice}, jual: ${p.sellPrice})`);
    } else {
      fail(`Gagal buat produk: ${p.name} — ${res.message || ''}`);
    }
  }

  info(`Total produk dibuat: ${products.length}/10`);
}

// ══════════════════════════════════════════════════
// STEP 2: BUAT PO & RECEIVE
// ══════════════════════════════════════════════════
async function createAndReceivePO() {
  divider('STEP 2: BUAT PO & RECEIVE SEMUA PRODUK');

  if (products.length === 0) { fail('Tidak ada produk untuk PO'); return; }

  const poItems = products.map(p => {
    const qty = randomInt(50, 200);
    totalStockIn[p.id] = qty;
    return { productId: p.id, quantity: qty, unitPrice: p.buyPrice };
  });

  info('PO Items:');
  poItems.forEach((item, i) => {
    info(`  ${products[i].name}: qty=${item.quantity}, harga=${item.unitPrice}`);
  });

  // Buat PO
  const poRes = await api('POST', '/purchase-orders', {
    supplierId,
    items: poItems,
    notes: '[TEST] PO untuk testing e2e',
  });

  if (!poRes.success || !poRes.data) {
    fail(`Gagal buat PO: ${poRes.message || ''}`);
    return;
  }
  const createdPO = poRes.data;
  pass(`PO dibuat: ${createdPO.poNumber} (${poItems.length} items)`);

  // Send PO first (DRAFT → SENT)
  const sendRes = await api('PUT', `/purchase-orders/${createdPO.id}/send`);
  if (sendRes.success) {
    pass(`PO dikirim ke supplier: status SENT`);
  } else {
    fail(`Gagal kirim PO: ${sendRes.message || ''}`);
  }

  // Receive PO (SENT → RECEIVED)
  const receiveItems = createdPO.items.map(item => ({
    itemId: item.id,
    receivedQty: item.quantity,
  }));

  const rcvRes = await api('PUT', `/purchase-orders/${createdPO.id}/receive`, {
    receivedItems: receiveItems,
  });

  if (rcvRes.success) {
    pass(`PO di-receive: ${createdPO.poNumber} — status: ${rcvRes.data?.status || 'RECEIVED'}`);
  } else {
    fail(`Gagal receive PO: ${rcvRes.message || ''}`);
  }

  // Verify stock updated
  for (const p of products) {
    const stockRes = await api('GET', `/stock/${p.id}`);
    if (stockRes.success) {
      const currentStock = stockRes.data?.stock?.stock || 0;
      info(`  ${p.name}: stok sekarang = ${currentStock}`);
    }
  }
}

// ══════════════════════════════════════════════════
// STEP 3: BUAT 15 TRANSAKSI + 4 RETUR
// ══════════════════════════════════════════════════
async function createTransactions() {
  divider('STEP 3: BUAT 15 TRANSAKSI');

  for (let i = 1; i <= 15; i++) {
    // Random 1-3 items per transaksi
    const numItems = randomInt(1, 3);
    const usedProducts = new Set();
    const items = [];

    for (let j = 0; j < numItems; j++) {
      let prodIdx;
      do { prodIdx = randomInt(0, products.length - 1); } while (usedProducts.has(prodIdx));
      usedProducts.add(prodIdx);

      const prod = products[prodIdx];
      const qty = randomInt(1, 5);
      totalStockOut[prod.id] = (totalStockOut[prod.id] || 0) + qty;

      items.push({
        productId: prod.id,
        quantity: qty,
        price: prod.sellPrice,
      });
    }

    const type = i <= 10 ? 'CASH' : 'BON';
    const res = await api('POST', '/transactions', {
      type,
      items,
      notes: `[TEST] Transaksi #${i}`,
    });

    if (res.success && res.data) {
      transactions.push(res.data);
      pass(`Transaksi #${i}: ${type} — ${items.length} item, total: ${res.data.total || 'N/A'}`);
    } else {
      fail(`Gagal buat transaksi #${i}: ${res.message || ''}`);
    }
  }

  info(`Total transaksi dibuat: ${transactions.length}/15`);
}

async function createReturns() {
  divider('STEP 3b: BUAT 4 RETUR');

  const returnable = transactions.slice(0, 4);

  for (let i = 0; i < returnable.length; i++) {
    const tx = returnable[i];

    // Get transaction detail to find items
    const detail = await api('GET', `/transactions/${tx.id}`);
    if (!detail.success || !detail.data?.items?.length) {
      fail(`Gagal ambil detail transaksi ${tx.id}`);
      continue;
    }

    // Retur item pertama saja, qty 1
    const firstItem = detail.data.items[0];
    const returnQty = 1;
    totalStockReturn[firstItem.productId] = (totalStockReturn[firstItem.productId] || 0) + returnQty;

    const res = await api('POST', '/returns', {
      transactionId: tx.id,
      reason: `[TEST] Retur testing #${i + 1}`,
      items: [{
        transactionItemId: firstItem.id,
        quantity: returnQty,
        reason: 'Barang rusak (test)',
      }],
    });

    if (res.success) {
      pass(`Retur #${i + 1}: transaksi ${tx.invoiceNumber || tx.id} — 1 item dikembalikan`);
    } else {
      fail(`Gagal buat retur #${i + 1}: ${res.message || ''}`);
    }
  }
}

// ══════════════════════════════════════════════════
// STEP 4-10: CHECK SEMUA LAPORAN
// ══════════════════════════════════════════════════
async function checkMonitoringStock() {
  divider('STEP 4: CHECK MONITORING STOCK');

  const res = await api('GET', '/stock?limit=50');
  if (!res.success) { fail('Gagal ambil monitoring stok'); return; }

  let allCorrect = true;
  for (const p of products) {
    const stockItem = res.data.find(s => s.id === p.id);
    if (!stockItem) { info(`  ${p.name}: TIDAK DITEMUKAN di monitoring`); continue; }

    const expectedStock = (totalStockIn[p.id] || 0) - (totalStockOut[p.id] || 0) + (totalStockReturn[p.id] || 0);
    const actualStock = stockItem.stock;

    if (actualStock === expectedStock) {
      pass(`${p.name}: stok=${actualStock} (masuk:${totalStockIn[p.id]}, keluar:${totalStockOut[p.id]}, retur:${totalStockReturn[p.id]}) ✓`);
    } else {
      fail(`${p.name}: stok=${actualStock}, expected=${expectedStock} (masuk:${totalStockIn[p.id]}, keluar:${totalStockOut[p.id]}, retur:${totalStockReturn[p.id]})`);
      allCorrect = false;
    }
  }

  if (allCorrect) pass('SEMUA STOK BALANCE!');

  // Test filters
  const searchRes = await api('GET', '/stock?search=semen');
  if (searchRes.success) pass(`Filter search berfungsi: ${searchRes.data?.length || 0} hasil`);
  else fail('Filter search gagal');

  const catRes = await api('GET', `/stock?categoryId=${categoryId}`);
  if (catRes.success) pass(`Filter kategori berfungsi: ${catRes.data?.length || 0} hasil`);
  else fail('Filter kategori gagal');
}

async function checkLaporanKeuangan() {
  divider('STEP 5: CHECK LAPORAN KEUANGAN');

  const res = await api('GET', '/reports/financial');
  if (!res.success) { fail('Gagal ambil laporan keuangan'); return; }

  const summary = res.data?.summary || {};
  info(`Total Tunai (CASH): ${summary.cashTotal || 0}`);
  info(`Total BON: ${summary.bonTotal || 0}`);
  info(`Total Retur: ${summary.totalReturn || 0}`);
  info(`Net Revenue: ${summary.netRevenue || 0}`);

  if (summary.cashTotal > 0) pass('Pendapatan CASH tercatat');
  else fail('Pendapatan CASH = 0, seharusnya ada');

  if (summary.bonTotal > 0) pass('Pendapatan BON tercatat');
  else fail('Pendapatan BON = 0, seharusnya ada');

  if (summary.totalReturn > 0) pass('Retur tercatat di laporan keuangan');
  else fail('Retur = 0, seharusnya ada');

  const perCashier = res.data?.perCashier || [];
  if (perCashier.length > 0) pass(`Data per kasir: ${perCashier.length} entri`);
  else fail('Data per kasir kosong');
}

async function checkLabaRugi() {
  divider('STEP 6: CHECK LABA RUGI');

  const res = await api('GET', '/reports/laba-rugi');
  if (!res.success) { fail('Gagal ambil laporan laba rugi'); return; }

  const summary = res.data?.summary || {};
  info(`Pendapatan Tunai: ${summary.cashRevenue || 0}`);
  info(`Pendapatan BON: ${summary.bonRevenue || 0}`);
  info(`Total Retur: ${summary.totalReturn || 0}`);
  info(`Net Revenue: ${summary.netRevenue || 0}`);
  info(`Total HPP: ${summary.totalHPP || 0}`);
  info(`Laba Kotor: ${summary.grossProfit || 0}`);
  info(`Margin: ${summary.grossMarginPercent || 0}%`);

  if (summary.netRevenue > 0) pass('Net Revenue > 0');
  else fail('Net Revenue <= 0');

  if (summary.totalHPP > 0) pass('HPP terhitung');
  else fail('HPP = 0');

  if (summary.grossProfit !== undefined) pass(`Laba Kotor terhitung: ${summary.grossProfit}`);

  // Check konsistensi: netRevenue = cashRevenue + bonRevenue - totalReturn
  const expectedNet = (summary.cashRevenue || 0) + (summary.bonRevenue || 0) - (summary.totalReturn || 0);
  if (Math.abs(expectedNet - (summary.netRevenue || 0)) < 1) {
    pass('BALANCE: netRevenue = cash + bon - retur ✓');
  } else {
    fail(`NOT BALANCE: expected=${expectedNet}, actual=${summary.netRevenue}`);
  }
}

async function checkLaporanTren() {
  divider('STEP 7: CHECK LAPORAN TREN');

  const res = await api('GET', '/reports/trend');
  if (!res.success) { fail('Gagal ambil laporan tren'); return; }

  const data = res.data || {};

  if (data.monthlyTrend?.length > 0) pass(`Tren bulanan: ${data.monthlyTrend.length} bulan`);
  else fail('Tren bulanan kosong');

  if (data.topProducts?.length > 0) pass(`Top products: ${data.topProducts.length} produk`);
  else fail('Top products kosong');

  if (data.periodComparison) pass(`Perbandingan periode: ${data.periodComparison.direction}, ${data.periodComparison.changePercent}%`);
}

async function checkTransaksi() {
  divider('STEP 8: CHECK TRANSAKSI');

  const res = await api('GET', '/transactions?limit=50');
  if (!res.success) { fail('Gagal ambil daftar transaksi'); return; }

  const txList = res.data || [];
  const testTx = txList.filter(t => t.notes?.includes('[TEST]'));
  info(`Total transaksi [TEST]: ${testTx.length}`);

  const cashCount = testTx.filter(t => t.type === 'CASH').length;
  const bonCount = testTx.filter(t => t.type === 'BON').length;
  info(`CASH: ${cashCount}, BON: ${bonCount}`);

  if (testTx.length >= 15) pass('15 transaksi tercatat di list');
  else fail(`Hanya ${testTx.length} transaksi, expected 15`);
}

async function checkRetur() {
  divider('STEP 9: CHECK RETUR');

  const res = await api('GET', '/returns?limit=50');
  if (!res.success) { fail('Gagal ambil daftar retur'); return; }

  const returns = res.data || [];
  info(`Total retur: ${returns.length}`);

  if (returns.length >= 4) pass('4 retur tercatat');
  else fail(`Hanya ${returns.length} retur, expected 4`);
}

async function checkDashboard() {
  divider('STEP 10: CHECK DASHBOARD / GRAFIK');

  const res = await api('GET', '/reports/dashboard');
  if (!res.success) { fail('Gagal ambil dashboard'); return; }

  const data = res.data || {};
  info(`Total Produk: ${data.totalProducts || 0}`);
  info(`Total Nilai Stok: ${data.totalStockValue || 0}`);
  info(`Transaksi Bulan Ini: ${data.monthlyTransaction?.count || 0} (total: ${data.monthlyTransaction?.total || 0})`);
  info(`Retur Bulan Ini: ${data.monthlyTransaction?.returnCount || 0} (total: ${data.monthlyTransaction?.returnTotal || 0})`);
  info(`Stok Rendah: ${data.lowStockCount || 0}`);
  info(`PO Aktif: ${data.activePOs || 0}`);
  info(`Proyek Aktif: ${data.activeProjects || 0}`);

  if (data.charts?.transactionTrend?.length > 0) pass(`Grafik tren: ${data.charts.transactionTrend.length} bulan`);
  else fail('Grafik tren kosong');

  if (data.charts?.topProducts?.length > 0) pass(`Top products di dashboard: ${data.charts.topProducts.length}`);
  else fail('Top products di dashboard kosong');

  if (data.totalProducts > 0) pass('Dashboard menampilkan total produk');
  if ((data.monthlyTransaction?.count || 0) > 0) pass('Dashboard menampilkan transaksi bulan ini');
}

// ══════════════════════════════════════════════════
// CLEANUP
// ══════════════════════════════════════════════════
async function cleanup() {
  divider('CLEANUP: HAPUS DATA TEST');

  // Delete products (cascade akan hapus terkait)
  for (const p of products) {
    await api('DELETE', `/products/${p.id}`);
  }
  info(`${products.length} produk test dihapus`);
  pass('Cleanup selesai');
}

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
async function main() {
  console.log('\n' + '🔥'.repeat(30));
  console.log('  E2E FLOW TEST — TOKO MATERIAL PESANTREN');
  console.log('🔥'.repeat(30));

  try {
    await login();
    await setup();
    await createProducts();
    await createAndReceivePO();
    await createTransactions();
    await createReturns();
    await checkMonitoringStock();
    await checkLaporanKeuangan();
    await checkLabaRugi();
    await checkLaporanTren();
    await checkTransaksi();
    await checkRetur();
    await checkDashboard();
    // await cleanup(); // Uncomment jika mau hapus data test

    divider('HASIL AKHIR');
    if (errors.length === 0) {
      console.log('\n  🎉🎉🎉  SEMUA TEST LULUS! SISTEM BERJALAN DENGAN BAIK!  🎉🎉🎉\n');
    } else {
      console.log(`\n  ⚠️  ${errors.length} MASALAH DITEMUKAN:\n`);
      errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
      console.log('');
    }
  } catch (err) {
    console.error('\n💥 FATAL ERROR:', err.message);
    console.error(err.stack);
  }
}

main();
