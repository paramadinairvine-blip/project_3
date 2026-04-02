const prisma = require('../src/lib/prisma');
const bcrypt = require('bcryptjs');

// Retry helper for unstable Railway connections
async function withRetry(fn, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i + 1}/${retries} after connection error...`);
      await new Promise((r) => setTimeout(r, delay));
      // Force reconnect
      await prisma.$disconnect();
      await prisma.$connect();
    }
  }
}

async function main() {
  await prisma.$connect();
  console.log('Seeding database...');

  // ==================== USERS ====================
  const hashedAdmin = await bcrypt.hash('admin123', 10);
  const hashedKasir = await bcrypt.hash('kasir123', 10);
  const hashedViewer = await bcrypt.hash('viewer123', 10);

  const admin = await withRetry(() => prisma.user.upsert({
    where: { email: 'admin@material.dn2' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@material.dn2',
      password: hashedAdmin,
      fullName: 'Administrator',
      phone: '081234567890',
      role: 'ADMIN',
    },
  }));

  const kasir = await withRetry(() => prisma.user.upsert({
    where: { email: 'kasir@material.dn2' },
    update: {},
    create: {
      username: 'kasir',
      email: 'kasir@material.dn2',
      password: hashedKasir,
      fullName: 'Kasir Toko',
      phone: '081234567891',
      role: 'KASIR',
    },
  }));

  const viewer = await withRetry(() => prisma.user.upsert({
    where: { email: 'viewer@material.dn2' },
    update: {},
    create: {
      username: 'viewer',
      email: 'viewer@material.dn2',
      password: hashedViewer,
      fullName: 'Pimpinan Pesantren',
      phone: '081234567892',
      role: 'VIEWER',
    },
  }));

  console.log('Users seeded:', { admin: admin.id, kasir: kasir.id, viewer: viewer.id });

  // ==================== CATEGORIES ====================
  const categoryData = [
    { name: 'Semen', children: ['Portland', 'Mortar', 'Instant'] },
    { name: 'Besi', children: ['Besi Beton', 'Besi Hollow', 'Besi Siku', 'Kawat', 'Paku'] },
    { name: 'Kayu', children: ['Papan', 'Balok', 'Multiplek', 'Triplek'] },
    { name: 'Cat', children: ['Cat Tembok', 'Cat Besi', 'Pelitur', 'Plamir'] },
    { name: 'Pasir & Batu', children: ['Pasir Halus', 'Pasir Kasar', 'Batu Split', 'Kerikil'] },
    { name: 'Atap', children: ['Genteng', 'Seng', 'Spandek', 'Asbes', 'Polycarbonate'] },
    { name: 'Pipa & Sanitasi', children: ['Pipa PVC', 'Pipa Besi', 'Fitting', 'Kran', 'Closet'] },
    { name: 'Listrik', children: ['Kabel', 'Saklar', 'Stop Kontak', 'Lampu', 'MCB'] },
    { name: 'Alat', children: ['Cangkul', 'Sekop', 'Ember', 'Meteran', 'Waterpass'] },
  ];

  const categories = {};
  for (const cat of categoryData) {
    let parent = await withRetry(async () => {
      let p = await prisma.category.findFirst({ where: { name: cat.name, parentId: null } });
      if (!p) p = await prisma.category.create({ data: { name: cat.name, createdBy: admin.id } });
      return p;
    });
    categories[cat.name] = parent;

    for (const childName of cat.children) {
      const pid = parent.id;
      let child = await withRetry(async () => {
        let c = await prisma.category.findFirst({ where: { name: childName, parentId: pid } });
        if (!c) c = await prisma.category.create({ data: { name: childName, parentId: pid, createdBy: admin.id } });
        return c;
      });
      categories[childName] = child;
    }
  }

  console.log('Categories seeded:', Object.keys(categories).length, 'total');

  // ==================== BRANDS ====================
  const brandNames = [
    'Tiga Roda', 'Holcim', 'Semen Gresik', 'Nippon Paint', 'Dulux',
    'Avian', 'Rucika', 'Wavin', 'Supreme', 'Philips',
  ];

  const brands = {};
  for (const name of brandNames) {
    const brand = await withRetry(() => prisma.brand.upsert({ where: { name }, update: {}, create: { name } }));
    brands[name] = brand;
  }

  console.log('Brands seeded:', brandNames.length);

  // ==================== UNIT OF MEASURES ====================
  const unitData = [
    { name: 'Sak', abbreviation: 'sak' },
    { name: 'Kilogram', abbreviation: 'kg' },
    { name: 'Batang', abbreviation: 'btg' },
    { name: 'Lembar', abbreviation: 'lbr' },
    { name: 'Meter', abbreviation: 'm' },
    { name: 'Buah', abbreviation: 'bh' },
    { name: 'Dus', abbreviation: 'dus' },
    { name: 'Liter', abbreviation: 'ltr' },
    { name: 'Roll', abbreviation: 'roll' },
    { name: 'Set', abbreviation: 'set' },
  ];

  const units = {};
  for (const u of unitData) {
    const unit = await withRetry(() => prisma.unitOfMeasure.upsert({ where: { abbreviation: u.abbreviation }, update: {}, create: u }));
    units[u.abbreviation] = unit;
  }

  console.log('Units seeded:', unitData.length);

  // ==================== UNIT LEMBAGA ====================
  const lembagaNames = [
    'Bagian Pembangunan',
    'Bagian Sarana Prasarana',
    'Asrama Putra',
    'Asrama Putri',
    'Masjid',
  ];

  for (const name of lembagaNames) {
    await withRetry(() => prisma.unitLembaga.upsert({ where: { name }, update: {}, create: { name } }));
  }

  console.log('Unit Lembaga seeded:', lembagaNames.length);

  // ==================== SUPPLIERS ====================
  const supplierData = [
    {
      name: 'Toko Bangunan Makmur',
      contactName: 'Pak Hasan',
      phone: '081345678901',
      email: 'makmur@supplier.id',
      address: 'Jl. Raya Industri No. 10',
    },
    {
      name: 'Toko Besi Jaya',
      contactName: 'Pak Joko',
      phone: '081345678902',
      email: 'besijaya@supplier.id',
      address: 'Jl. Besi Raya No. 25',
    },
    {
      name: 'CV Material Sejahtera',
      contactName: 'Bu Sari',
      phone: '081345678903',
      email: 'sejahtera@supplier.id',
      address: 'Jl. Material Blok C No. 5',
    },
  ];

  const suppliers = {};
  for (const s of supplierData) {
    const supplier = await withRetry(async () => {
      let sup = await prisma.supplier.findFirst({ where: { name: s.name } });
      if (!sup) sup = await prisma.supplier.create({ data: { ...s, createdBy: admin.id } });
      return sup;
    });
    suppliers[s.name] = supplier;
  }

  console.log('Suppliers seeded:', supplierData.length);

  // ==================== PRODUCTS ====================
  const productData = [
    {
      name: 'Semen Tiga Roda 50kg',
      sku: 'SMN-TR-50',
      barcode: '8991001100011',
      category: 'Portland',
      brand: 'Tiga Roda',
      supplier: 'Toko Bangunan Makmur',
      unit: 'sak',
      buyPrice: 65000,
      sellPrice: 72000,
      stock: 150,
      minStock: 20,
    },
    {
      name: 'Semen Holcim 50kg',
      sku: 'SMN-HC-50',
      barcode: '8991001100012',
      category: 'Portland',
      brand: 'Holcim',
      supplier: 'Toko Bangunan Makmur',
      unit: 'sak',
      buyPrice: 62000,
      sellPrice: 70000,
      stock: 100,
      minStock: 20,
    },
    {
      name: 'Semen Gresik 50kg',
      sku: 'SMN-GR-50',
      barcode: '8991001100013',
      category: 'Portland',
      brand: 'Semen Gresik',
      supplier: 'Toko Bangunan Makmur',
      unit: 'sak',
      buyPrice: 63000,
      sellPrice: 71000,
      stock: 120,
      minStock: 20,
    },
    {
      name: 'Besi Beton 10mm',
      sku: 'BSI-BTN-10',
      barcode: '8991002200011',
      category: 'Besi Beton',
      brand: null,
      supplier: 'Toko Besi Jaya',
      unit: 'btg',
      buyPrice: 85000,
      sellPrice: 95000,
      stock: 200,
      minStock: 30,
    },
    {
      name: 'Besi Beton 8mm',
      sku: 'BSI-BTN-08',
      barcode: '8991002200012',
      category: 'Besi Beton',
      brand: null,
      supplier: 'Toko Besi Jaya',
      unit: 'btg',
      buyPrice: 55000,
      sellPrice: 65000,
      stock: 180,
      minStock: 30,
    },
    {
      name: 'Besi Hollow 40x40',
      sku: 'BSI-HLW-40',
      barcode: '8991002200013',
      category: 'Besi Hollow',
      brand: null,
      supplier: 'Toko Besi Jaya',
      unit: 'btg',
      buyPrice: 95000,
      sellPrice: 110000,
      stock: 80,
      minStock: 10,
    },
    {
      name: 'Cat Dulux Weathershield 5kg',
      sku: 'CAT-DLX-WS5',
      barcode: '8991003300011',
      category: 'Cat Tembok',
      brand: 'Dulux',
      supplier: 'CV Material Sejahtera',
      unit: 'bh',
      buyPrice: 180000,
      sellPrice: 210000,
      stock: 40,
      minStock: 5,
    },
    {
      name: 'Cat Nippon Vinilex 5kg',
      sku: 'CAT-NPN-VN5',
      barcode: '8991003300012',
      category: 'Cat Tembok',
      brand: 'Nippon Paint',
      supplier: 'CV Material Sejahtera',
      unit: 'bh',
      buyPrice: 95000,
      sellPrice: 115000,
      stock: 50,
      minStock: 5,
    },
    {
      name: 'Cat Avian 5kg',
      sku: 'CAT-AVN-5',
      barcode: '8991003300013',
      category: 'Cat Tembok',
      brand: 'Avian',
      supplier: 'CV Material Sejahtera',
      unit: 'bh',
      buyPrice: 75000,
      sellPrice: 90000,
      stock: 60,
      minStock: 5,
    },
    {
      name: 'Pipa PVC Rucika 4"',
      sku: 'PPA-RCK-4',
      barcode: '8991004400011',
      category: 'Pipa PVC',
      brand: 'Rucika',
      supplier: 'CV Material Sejahtera',
      unit: 'btg',
      buyPrice: 75000,
      sellPrice: 88000,
      stock: 60,
      minStock: 10,
    },
    {
      name: 'Pipa PVC Wavin 3"',
      sku: 'PPA-WVN-3',
      barcode: '8991004400012',
      category: 'Pipa PVC',
      brand: 'Wavin',
      supplier: 'CV Material Sejahtera',
      unit: 'btg',
      buyPrice: 55000,
      sellPrice: 68000,
      stock: 45,
      minStock: 10,
    },
    {
      name: 'Kabel NYM 2x1.5 Supreme',
      sku: 'LTK-KBL-NYM215',
      barcode: '8991005500011',
      category: 'Kabel',
      brand: 'Supreme',
      supplier: 'CV Material Sejahtera',
      unit: 'roll',
      buyPrice: 350000,
      sellPrice: 400000,
      stock: 25,
      minStock: 5,
    },
    {
      name: 'Lampu LED Philips 12W',
      sku: 'LTK-LMP-PHL12',
      barcode: '8991005500012',
      category: 'Lampu',
      brand: 'Philips',
      supplier: 'CV Material Sejahtera',
      unit: 'bh',
      buyPrice: 25000,
      sellPrice: 35000,
      stock: 100,
      minStock: 20,
    },
    {
      name: 'Multiplek 12mm 122x244',
      sku: 'KYU-MPL-12',
      barcode: '8991006600011',
      category: 'Multiplek',
      brand: null,
      supplier: 'Toko Bangunan Makmur',
      unit: 'lbr',
      buyPrice: 165000,
      sellPrice: 190000,
      stock: 30,
      minStock: 5,
    },
    {
      name: 'Paku 5cm 1kg',
      sku: 'BSI-PKU-5',
      barcode: '8991002200014',
      category: 'Paku',
      brand: null,
      supplier: 'Toko Besi Jaya',
      unit: 'kg',
      buyPrice: 18000,
      sellPrice: 22000,
      stock: 50,
      minStock: 10,
    },
    {
      name: 'Seng Gelombang BJLS 180cm',
      sku: 'ATP-SNG-180',
      barcode: '8991007700011',
      category: 'Seng',
      brand: null,
      supplier: 'Toko Besi Jaya',
      unit: 'lbr',
      buyPrice: 65000,
      sellPrice: 78000,
      stock: 70,
      minStock: 10,
    },
    {
      name: 'Pasir Halus per m3',
      sku: 'PSR-HLS-M3',
      barcode: '8991008800011',
      category: 'Pasir Halus',
      brand: null,
      supplier: 'Toko Bangunan Makmur',
      unit: 'bh',
      buyPrice: 250000,
      sellPrice: 300000,
      stock: 20,
      minStock: 5,
    },
    {
      name: 'Kran Air Kuningan 1/2"',
      sku: 'PPA-KRN-12',
      barcode: '8991004400013',
      category: 'Kran',
      brand: null,
      supplier: 'CV Material Sejahtera',
      unit: 'bh',
      buyPrice: 35000,
      sellPrice: 45000,
      stock: 30,
      minStock: 5,
    },
    {
      name: 'MCB 16A Schneider',
      sku: 'LTK-MCB-16',
      barcode: '8991005500013',
      category: 'MCB',
      brand: null,
      supplier: 'CV Material Sejahtera',
      unit: 'bh',
      buyPrice: 45000,
      sellPrice: 58000,
      stock: 25,
      minStock: 5,
    },
    {
      name: 'Cangkul Biasa',
      sku: 'ALT-CKL-01',
      barcode: '8991009900011',
      category: 'Cangkul',
      brand: null,
      supplier: 'Toko Bangunan Makmur',
      unit: 'bh',
      buyPrice: 45000,
      sellPrice: 55000,
      stock: 15,
      minStock: 3,
    },
  ];

  const products = {};
  for (const p of productData) {
    const product = await withRetry(() =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: {},
        create: {
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          categoryId: categories[p.category]?.id || null,
          supplierId: suppliers[p.supplier]?.id || null,
          brandId: p.brand ? brands[p.brand]?.id || null : null,
          unitId: units[p.unit]?.id || null,
          unit: p.unit,
          buyPrice: p.buyPrice,
          sellPrice: p.sellPrice,
          stock: p.stock,
          minStock: p.minStock,
          createdBy: admin.id,
        },
      })
    );
    products[p.sku] = product;
  }

  console.log('Products seeded:', Object.keys(products).length);

  // ==================== UNIT LEMBAGA (fetch for reference) ====================
  const unitLembagaList = await withRetry(() => prisma.unitLembaga.findMany());
  const unitLembaga = {};
  for (const ul of unitLembagaList) {
    unitLembaga[ul.name] = ul;
  }

  // ==================== RESET TRANSACTIONAL DATA ====================
  console.log('Resetting transactional data...');
  // Delete in correct order (children first, then parents)
  await withRetry(() => prisma.transactionReturnItem.deleteMany());
  await withRetry(() => prisma.transactionReturn.deleteMany());
  await withRetry(() => prisma.transactionItem.deleteMany());
  await withRetry(() => prisma.transaction.deleteMany());
  await withRetry(() => prisma.stockMovement.deleteMany());
  await withRetry(() => prisma.stockOpnameItem.deleteMany());
  await withRetry(() => prisma.stockOpname.deleteMany());
  await withRetry(() => prisma.purchaseOrderItem.deleteMany());
  await withRetry(() => prisma.purchaseOrder.deleteMany());
  await withRetry(() => prisma.projectMaterial.deleteMany());
  await withRetry(() => prisma.project.deleteMany());
  await withRetry(() => prisma.priceHistory.deleteMany());
  await withRetry(() => prisma.auditLog.deleteMany());
  await withRetry(() => prisma.notification.deleteMany());

  // Reset product stock to seed values
  for (const p of productData) {
    await withRetry(() => prisma.product.update({
      where: { sku: p.sku },
      data: { stock: p.stock },
    }));
  }

  console.log('Transactional data reset complete.');

  // ==================== PURCHASE ORDERS ====================
  // PO-1: Fully received from Toko Bangunan Makmur
  const po1 = await withRetry(() => prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-20260301-001',
      supplierId: suppliers['Toko Bangunan Makmur'].id,
      status: 'RECEIVED',
      notes: 'Restok semen bulanan',
      totalAmount: 6360000,
      orderDate: new Date('2026-03-01T08:00:00+07:00'),
      receivedAt: new Date('2026-03-03T10:00:00+07:00'),
      createdBy: admin.id,
      items: {
        create: [
          {
            productId: products['SMN-TR-50'].id,
            unitId: units['sak'].id,
            quantity: 50,
            baseQty: 50,
            receivedQty: 50,
            receivedBaseQty: 50,
            price: 65000,
            subtotal: 3250000,
          },
          {
            productId: products['SMN-HC-50'].id,
            unitId: units['sak'].id,
            quantity: 30,
            baseQty: 30,
            receivedQty: 30,
            receivedBaseQty: 30,
            price: 62000,
            subtotal: 1860000,
          },
          {
            productId: products['PSR-HLS-M3'].id,
            unitId: units['bh'].id,
            quantity: 5,
            baseQty: 5,
            receivedQty: 5,
            receivedBaseQty: 5,
            price: 250000,
            subtotal: 1250000,
          },
        ],
      },
    },
  }));

  // PO-2: Partially received from Toko Besi Jaya
  const po2 = await withRetry(() => prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-20260310-001',
      supplierId: suppliers['Toko Besi Jaya'].id,
      status: 'PARTIALLY_RECEIVED',
      notes: 'Order besi untuk proyek asrama',
      totalAmount: 5710000,
      orderDate: new Date('2026-03-10T09:00:00+07:00'),
      createdBy: admin.id,
      items: {
        create: [
          {
            productId: products['BSI-BTN-10'].id,
            unitId: units['btg'].id,
            quantity: 50,
            baseQty: 50,
            receivedQty: 30,
            receivedBaseQty: 30,
            price: 85000,
            subtotal: 4250000,
          },
          {
            productId: products['BSI-BTN-08'].id,
            unitId: units['btg'].id,
            quantity: 20,
            baseQty: 20,
            receivedQty: 20,
            receivedBaseQty: 20,
            price: 55000,
            subtotal: 1100000,
          },
          {
            productId: products['BSI-PKU-5'].id,
            unitId: units['kg'].id,
            quantity: 20,
            baseQty: 20,
            receivedQty: 0,
            receivedBaseQty: 0,
            price: 18000,
            subtotal: 360000,
          },
        ],
      },
    },
  }));

  // PO-3: Draft from CV Material Sejahtera
  const po3 = await withRetry(() => prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-20260325-001',
      supplierId: suppliers['CV Material Sejahtera'].id,
      status: 'DRAFT',
      notes: 'Rencana restok cat dan pipa',
      totalAmount: 2640000,
      orderDate: new Date('2026-03-25T08:00:00+07:00'),
      createdBy: admin.id,
      items: {
        create: [
          {
            productId: products['CAT-DLX-WS5'].id,
            unitId: units['bh'].id,
            quantity: 10,
            baseQty: 10,
            receivedQty: 0,
            receivedBaseQty: 0,
            price: 180000,
            subtotal: 1800000,
          },
          {
            productId: products['PPA-RCK-4'].id,
            unitId: units['btg'].id,
            quantity: 10,
            baseQty: 10,
            receivedQty: 0,
            receivedBaseQty: 0,
            price: 75000,
            subtotal: 750000,
          },
          {
            productId: products['PPA-KRN-12'].id,
            unitId: units['bh'].id,
            quantity: 5,
            baseQty: 5,
            receivedQty: 0,
            receivedBaseQty: 0,
            price: 18000,
            subtotal: 90000,
          },
        ],
      },
    },
  }));

  console.log('Purchase Orders seeded: 3');

  // ==================== STOCK MOVEMENTS ====================
  // Stock IN from PO-1 received
  const stockMovements = [
    {
      productId: products['SMN-TR-50'].id,
      type: 'IN',
      quantity: 50,
      previousStock: 150,
      newStock: 200,
      referenceType: 'PO',
      referenceId: po1.id,
      notes: 'Penerimaan PO-20260301-001',
      createdAt: new Date('2026-03-03T10:00:00+07:00'),
      createdBy: admin.id,
    },
    {
      productId: products['SMN-HC-50'].id,
      type: 'IN',
      quantity: 30,
      previousStock: 100,
      newStock: 130,
      referenceType: 'PO',
      referenceId: po1.id,
      notes: 'Penerimaan PO-20260301-001',
      createdAt: new Date('2026-03-03T10:05:00+07:00'),
      createdBy: admin.id,
    },
    {
      productId: products['PSR-HLS-M3'].id,
      type: 'IN',
      quantity: 5,
      previousStock: 20,
      newStock: 25,
      referenceType: 'PO',
      referenceId: po1.id,
      notes: 'Penerimaan PO-20260301-001',
      createdAt: new Date('2026-03-03T10:10:00+07:00'),
      createdBy: admin.id,
    },
    // Stock IN from PO-2 partial
    {
      productId: products['BSI-BTN-10'].id,
      type: 'IN',
      quantity: 30,
      previousStock: 200,
      newStock: 230,
      referenceType: 'PO',
      referenceId: po2.id,
      notes: 'Penerimaan parsial PO-20260310-001',
      createdAt: new Date('2026-03-12T14:00:00+07:00'),
      createdBy: admin.id,
    },
    {
      productId: products['BSI-BTN-08'].id,
      type: 'IN',
      quantity: 20,
      previousStock: 180,
      newStock: 200,
      referenceType: 'PO',
      referenceId: po2.id,
      notes: 'Penerimaan parsial PO-20260310-001',
      createdAt: new Date('2026-03-12T14:05:00+07:00'),
      createdBy: admin.id,
    },
    // Manual adjustments
    {
      productId: products['CAT-AVN-5'].id,
      type: 'ADJUSTMENT',
      quantity: -3,
      previousStock: 60,
      newStock: 57,
      referenceType: 'MANUAL',
      notes: 'Koreksi stok - 3 kaleng penyok ditemukan saat cek gudang',
      createdAt: new Date('2026-03-15T09:00:00+07:00'),
      createdBy: admin.id,
    },
    {
      productId: products['LTK-LMP-PHL12'].id,
      type: 'ADJUSTMENT',
      quantity: 5,
      previousStock: 100,
      newStock: 105,
      referenceType: 'MANUAL',
      notes: 'Koreksi stok - ditemukan 5 unit belum tercatat dari kiriman lama',
      createdAt: new Date('2026-03-16T11:00:00+07:00'),
      createdBy: admin.id,
    },
  ];

  for (const sm of stockMovements) {
    await withRetry(() => prisma.stockMovement.create({ data: sm }));
  }

  console.log('Stock Movements seeded:', stockMovements.length);

  // ==================== PROJECTS ====================
  const projectRenovasi = await withRetry(() => prisma.project.create({
    data: {
      name: 'Renovasi Asrama Putra',
      description: 'Renovasi kamar mandi dan perbaikan atap asrama putra lantai 2',
      status: 'IN_PROGRESS',
      budget: 25000000,
      spent: 8500000,
      startDate: new Date('2026-03-15'),
      endDate: new Date('2026-05-15'),
      createdBy: admin.id,
      materials: {
        create: [
          {
            productId: products['SMN-TR-50'].id,
            estimatedQty: 30,
            usedQty: 12,
            unitPrice: 72000,
            notes: 'Untuk cor kamar mandi',
          },
          {
            productId: products['BSI-BTN-10'].id,
            estimatedQty: 40,
            usedQty: 15,
            unitPrice: 95000,
            notes: 'Untuk tulangan cor',
          },
          {
            productId: products['ATP-SNG-180'].id,
            estimatedQty: 20,
            usedQty: 0,
            unitPrice: 78000,
            notes: 'Penggantian atap',
          },
          {
            productId: products['PPA-RCK-4'].id,
            estimatedQty: 15,
            usedQty: 8,
            unitPrice: 88000,
            notes: 'Pipa air kamar mandi',
          },
        ],
      },
    },
  }));

  const projectMusholla = await withRetry(() => prisma.project.create({
    data: {
      name: 'Pembangunan Musholla Baru',
      description: 'Pembangunan musholla di area asrama putri',
      status: 'PLANNING',
      budget: 50000000,
      spent: 0,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-12-31'),
      createdBy: admin.id,
      materials: {
        create: [
          {
            productId: products['SMN-GR-50'].id,
            estimatedQty: 100,
            usedQty: 0,
            unitPrice: 71000,
          },
          {
            productId: products['BSI-BTN-10'].id,
            estimatedQty: 80,
            usedQty: 0,
            unitPrice: 95000,
          },
          {
            productId: products['PSR-HLS-M3'].id,
            estimatedQty: 15,
            usedQty: 0,
            unitPrice: 300000,
          },
        ],
      },
    },
  }));

  console.log('Projects seeded: 2');

  // ==================== TRANSACTIONS ====================
  // TRX-1: CASH - Pembelian semen oleh tukang
  const trx1 = await withRetry(() => prisma.transaction.create({
    data: {
      transactionNumber: 'TRX-20260305-001',
      type: 'CASH',
      status: 'COMPLETED',
      customerName: 'Pak Ahmad',
      subtotal: 504000,
      discount: 0,
      tax: 0,
      total: 504000,
      paidAmount: 510000,
      changeAmount: 6000,
      createdAt: new Date('2026-03-05T08:30:00+07:00'),
      updatedAt: new Date('2026-03-05T08:30:00+07:00'),
      createdBy: kasir.id,
      items: {
        create: [
          {
            productId: products['SMN-TR-50'].id,
            unitId: units['sak'].id,
            quantity: 5,
            baseQty: 5,
            price: 72000,
            discount: 0,
            subtotal: 360000,
          },
          {
            productId: products['BSI-PKU-5'].id,
            unitId: units['kg'].id,
            quantity: 3,
            baseQty: 3,
            price: 22000,
            discount: 0,
            subtotal: 66000,
          },
          {
            productId: products['ATP-SNG-180'].id,
            unitId: units['lbr'].id,
            quantity: 1,
            baseQty: 1,
            price: 78000,
            discount: 0,
            subtotal: 78000,
          },
        ],
      },
    },
  }));

  // TRX-2: CASH - Pembelian cat
  const trx2 = await withRetry(() => prisma.transaction.create({
    data: {
      transactionNumber: 'TRX-20260307-001',
      type: 'CASH',
      status: 'COMPLETED',
      customerName: 'Bu Fatimah',
      subtotal: 535000,
      discount: 0,
      tax: 0,
      total: 535000,
      paidAmount: 550000,
      changeAmount: 15000,
      createdAt: new Date('2026-03-07T10:15:00+07:00'),
      updatedAt: new Date('2026-03-07T10:15:00+07:00'),
      createdBy: kasir.id,
      items: {
        create: [
          {
            productId: products['CAT-DLX-WS5'].id,
            unitId: units['bh'].id,
            quantity: 2,
            baseQty: 2,
            price: 210000,
            discount: 0,
            subtotal: 420000,
          },
          {
            productId: products['CAT-NPN-VN5'].id,
            unitId: units['bh'].id,
            quantity: 1,
            baseQty: 1,
            price: 115000,
            discount: 0,
            subtotal: 115000,
          },
        ],
      },
    },
  }));

  // TRX-3: BON - Kredit untuk proyek tetangga, sudah lunas
  const trx3 = await withRetry(() => prisma.transaction.create({
    data: {
      transactionNumber: 'TRX-20260310-001',
      type: 'BON',
      status: 'COMPLETED',
      customerName: 'Pak Burhan',
      customerPhone: '081234500001',
      notes: 'Untuk renovasi rumah, lunas 20 Maret',
      subtotal: 1610000,
      discount: 0,
      tax: 0,
      total: 1610000,
      paidAmount: 1610000,
      changeAmount: 0,
      dueDate: new Date('2026-03-25'),
      paidAt: new Date('2026-03-20T16:00:00+07:00'),
      createdAt: new Date('2026-03-10T14:00:00+07:00'),
      updatedAt: new Date('2026-03-20T16:00:00+07:00'),
      createdBy: kasir.id,
      items: {
        create: [
          {
            productId: products['SMN-TR-50'].id,
            unitId: units['sak'].id,
            quantity: 10,
            baseQty: 10,
            price: 72000,
            discount: 0,
            subtotal: 720000,
          },
          {
            productId: products['BSI-BTN-10'].id,
            unitId: units['btg'].id,
            quantity: 5,
            baseQty: 5,
            price: 95000,
            discount: 0,
            subtotal: 475000,
          },
          {
            productId: products['BSI-BTN-08'].id,
            unitId: units['btg'].id,
            quantity: 5,
            baseQty: 5,
            price: 65000,
            discount: 0,
            subtotal: 325000,
          },
          {
            productId: products['PPA-KRN-12'].id,
            unitId: units['bh'].id,
            quantity: 2,
            baseQty: 2,
            price: 45000,
            discount: 0,
            subtotal: 90000,
          },
        ],
      },
    },
  }));

  // TRX-4: BON - Masih belum lunas (PENDING)
  const trx4 = await withRetry(() => prisma.transaction.create({
    data: {
      transactionNumber: 'TRX-20260318-001',
      type: 'BON',
      status: 'PENDING',
      customerName: 'Pak Dedi',
      customerPhone: '081234500002',
      notes: 'Untuk perbaikan warung',
      subtotal: 816000,
      discount: 0,
      tax: 0,
      total: 816000,
      paidAmount: 0,
      changeAmount: 0,
      dueDate: new Date('2026-04-18'),
      createdAt: new Date('2026-03-18T09:00:00+07:00'),
      updatedAt: new Date('2026-03-18T09:00:00+07:00'),
      createdBy: kasir.id,
      items: {
        create: [
          {
            productId: products['SMN-HC-50'].id,
            unitId: units['sak'].id,
            quantity: 8,
            baseQty: 8,
            price: 70000,
            discount: 0,
            subtotal: 560000,
          },
          {
            productId: products['BSI-PKU-5'].id,
            unitId: units['kg'].id,
            quantity: 2,
            baseQty: 2,
            price: 22000,
            discount: 0,
            subtotal: 44000,
          },
          {
            productId: products['KYU-MPL-12'].id,
            unitId: units['lbr'].id,
            quantity: 1,
            baseQty: 1,
            price: 190000,
            discount: 0,
            subtotal: 190000,
          },
          {
            productId: products['BSI-PKU-5'].id,
            unitId: units['kg'].id,
            quantity: 1,
            baseQty: 1,
            price: 22000,
            discount: 0,
            subtotal: 22000,
          },
        ],
      },
    },
  }));

  // TRX-5: CASH - Pembelian listrik
  const trx5 = await withRetry(() => prisma.transaction.create({
    data: {
      transactionNumber: 'TRX-20260320-001',
      type: 'CASH',
      status: 'COMPLETED',
      subtotal: 493000,
      discount: 0,
      tax: 0,
      total: 493000,
      paidAmount: 500000,
      changeAmount: 7000,
      createdAt: new Date('2026-03-20T11:00:00+07:00'),
      updatedAt: new Date('2026-03-20T11:00:00+07:00'),
      createdBy: kasir.id,
      items: {
        create: [
          {
            productId: products['LTK-KBL-NYM215'].id,
            unitId: units['roll'].id,
            quantity: 1,
            baseQty: 1,
            price: 400000,
            discount: 0,
            subtotal: 400000,
          },
          {
            productId: products['LTK-MCB-16'].id,
            unitId: units['bh'].id,
            quantity: 1,
            baseQty: 1,
            price: 58000,
            discount: 0,
            subtotal: 58000,
          },
          {
            productId: products['LTK-LMP-PHL12'].id,
            unitId: units['bh'].id,
            quantity: 1,
            baseQty: 1,
            price: 35000,
            discount: 0,
            subtotal: 35000,
          },
        ],
      },
    },
  }));

  // TRX-6: CASH - Terkait proyek Renovasi Asrama
  const trx6 = await withRetry(() => prisma.transaction.create({
    data: {
      transactionNumber: 'TRX-20260322-001',
      type: 'CASH',
      status: 'COMPLETED',
      notes: 'Pengambilan material proyek renovasi asrama putra',
      subtotal: 2399000,
      discount: 0,
      tax: 0,
      total: 2399000,
      paidAmount: 2399000,
      changeAmount: 0,
      projectId: projectRenovasi.id,
      createdAt: new Date('2026-03-22T08:00:00+07:00'),
      updatedAt: new Date('2026-03-22T08:00:00+07:00'),
      createdBy: kasir.id,
      items: {
        create: [
          {
            productId: products['SMN-TR-50'].id,
            unitId: units['sak'].id,
            quantity: 12,
            baseQty: 12,
            price: 72000,
            discount: 0,
            subtotal: 864000,
          },
          {
            productId: products['BSI-BTN-10'].id,
            unitId: units['btg'].id,
            quantity: 15,
            baseQty: 15,
            price: 95000,
            discount: 0,
            subtotal: 1425000,
          },
          {
            productId: products['BSI-PKU-5'].id,
            unitId: units['kg'].id,
            quantity: 5,
            baseQty: 5,
            price: 22000,
            discount: 0,
            subtotal: 110000,
          },
        ],
      },
    },
  }));

  // TRX-7: CASH - Terkait unit lembaga Masjid
  const trx7 = await withRetry(() => prisma.transaction.create({
    data: {
      transactionNumber: 'TRX-20260328-001',
      type: 'CASH',
      status: 'COMPLETED',
      notes: 'Kebutuhan perbaikan toilet masjid',
      subtotal: 578000,
      discount: 0,
      tax: 0,
      total: 578000,
      paidAmount: 580000,
      changeAmount: 2000,
      unitLembagaId: unitLembaga['Masjid'].id,
      createdAt: new Date('2026-03-28T13:30:00+07:00'),
      updatedAt: new Date('2026-03-28T13:30:00+07:00'),
      createdBy: kasir.id,
      items: {
        create: [
          {
            productId: products['PPA-RCK-4'].id,
            unitId: units['btg'].id,
            quantity: 3,
            baseQty: 3,
            price: 88000,
            discount: 0,
            subtotal: 264000,
          },
          {
            productId: products['PPA-KRN-12'].id,
            unitId: units['bh'].id,
            quantity: 3,
            baseQty: 3,
            price: 45000,
            discount: 0,
            subtotal: 135000,
          },
          {
            productId: products['SMN-TR-50'].id,
            unitId: units['sak'].id,
            quantity: 2,
            baseQty: 2,
            price: 72000,
            discount: 0,
            subtotal: 144000,
          },
          {
            productId: products['LTK-LMP-PHL12'].id,
            unitId: units['bh'].id,
            quantity: 1,
            baseQty: 1,
            price: 35000,
            discount: 0,
            subtotal: 35000,
          },
        ],
      },
    },
  }));

  // TRX-8: CASH - Pembelian April (bulan ini)
  const trx8 = await withRetry(() => prisma.transaction.create({
    data: {
      transactionNumber: 'TRX-20260401-001',
      type: 'CASH',
      status: 'COMPLETED',
      customerName: 'Pak Usman',
      subtotal: 403000,
      discount: 0,
      tax: 0,
      total: 403000,
      paidAmount: 403000,
      changeAmount: 0,
      createdAt: new Date('2026-04-01T09:00:00+07:00'),
      updatedAt: new Date('2026-04-01T09:00:00+07:00'),
      createdBy: kasir.id,
      items: {
        create: [
          {
            productId: products['SMN-GR-50'].id,
            unitId: units['sak'].id,
            quantity: 3,
            baseQty: 3,
            price: 71000,
            discount: 0,
            subtotal: 213000,
          },
          {
            productId: products['KYU-MPL-12'].id,
            unitId: units['lbr'].id,
            quantity: 1,
            baseQty: 1,
            price: 190000,
            discount: 0,
            subtotal: 190000,
          },
        ],
      },
    },
  }));

  // Stock movements for transactions (OUT)
  const trxStockMovements = [
    // TRX-1
    { productId: products['SMN-TR-50'].id, type: 'OUT', quantity: 5, previousStock: 200, newStock: 195, referenceType: 'TRANSACTION', referenceId: trx1.id, createdAt: new Date('2026-03-05T08:30:00+07:00'), createdBy: kasir.id },
    { productId: products['BSI-PKU-5'].id, type: 'OUT', quantity: 3, previousStock: 50, newStock: 47, referenceType: 'TRANSACTION', referenceId: trx1.id, createdAt: new Date('2026-03-05T08:30:00+07:00'), createdBy: kasir.id },
    { productId: products['ATP-SNG-180'].id, type: 'OUT', quantity: 1, previousStock: 70, newStock: 69, referenceType: 'TRANSACTION', referenceId: trx1.id, createdAt: new Date('2026-03-05T08:30:00+07:00'), createdBy: kasir.id },
    // TRX-2
    { productId: products['CAT-DLX-WS5'].id, type: 'OUT', quantity: 2, previousStock: 40, newStock: 38, referenceType: 'TRANSACTION', referenceId: trx2.id, createdAt: new Date('2026-03-07T10:15:00+07:00'), createdBy: kasir.id },
    { productId: products['CAT-NPN-VN5'].id, type: 'OUT', quantity: 1, previousStock: 50, newStock: 49, referenceType: 'TRANSACTION', referenceId: trx2.id, createdAt: new Date('2026-03-07T10:15:00+07:00'), createdBy: kasir.id },
    // TRX-6 (proyek)
    { productId: products['SMN-TR-50'].id, type: 'OUT', quantity: 12, previousStock: 195, newStock: 183, referenceType: 'TRANSACTION', referenceId: trx6.id, createdAt: new Date('2026-03-22T08:00:00+07:00'), createdBy: kasir.id },
    { productId: products['BSI-BTN-10'].id, type: 'OUT', quantity: 15, previousStock: 230, newStock: 215, referenceType: 'TRANSACTION', referenceId: trx6.id, createdAt: new Date('2026-03-22T08:00:00+07:00'), createdBy: kasir.id },
  ];

  for (const sm of trxStockMovements) {
    await withRetry(() => prisma.stockMovement.create({ data: sm }));
  }

  console.log('Transactions seeded: 8');

  // ==================== TRANSACTION RETURNS ====================
  // Retur dari TRX-1: Pak Ahmad kembalikan 2 sak semen (pecah saat angkut)
  const trx1Items = await withRetry(() => prisma.transactionItem.findMany({
    where: { transactionId: trx1.id },
  }));
  const semenItem = trx1Items.find((i) => i.productId === products['SMN-TR-50'].id);

  const retur1 = await withRetry(() => prisma.transactionReturn.create({
    data: {
      returnNumber: 'RET-20260306-001',
      transactionId: trx1.id,
      reason: 'Semen pecah saat pengangkutan, 2 sak rusak',
      refundAmount: 144000,
      createdAt: new Date('2026-03-06T09:00:00+07:00'),
      createdBy: kasir.id,
      items: {
        create: [
          {
            transactionItemId: semenItem.id,
            productId: products['SMN-TR-50'].id,
            quantity: 2,
            baseQty: 2,
            price: 72000,
            subtotal: 144000,
          },
        ],
      },
    },
  }));

  // Stock movement for return (IN)
  await withRetry(() => prisma.stockMovement.create({
    data: {
      productId: products['SMN-TR-50'].id,
      type: 'IN',
      quantity: 2,
      previousStock: 183,
      newStock: 185,
      referenceType: 'RETURN',
      referenceId: retur1.id,
      notes: 'Retur RET-20260306-001 - semen pecah',
      createdAt: new Date('2026-03-06T09:00:00+07:00'),
      createdBy: kasir.id,
    },
  }));

  console.log('Transaction Returns seeded: 1');

  // ==================== STOCK OPNAME ====================
  const opname1 = await withRetry(() => prisma.stockOpname.create({
    data: {
      opnameNumber: 'OPN-20260320-001',
      status: 'COMPLETED',
      notes: 'Stock opname bulanan Maret 2026',
      opnameDate: new Date('2026-03-20T07:00:00+07:00'),
      completedAt: new Date('2026-03-20T12:00:00+07:00'),
      createdBy: admin.id,
      items: {
        create: [
          {
            productId: products['SMN-TR-50'].id,
            systemStock: 185,
            actualStock: 183,
            difference: -2,
            notes: 'Selisih, kemungkinan salah hitung sebelumnya',
          },
          {
            productId: products['BSI-BTN-10'].id,
            systemStock: 215,
            actualStock: 215,
            difference: 0,
          },
          {
            productId: products['CAT-DLX-WS5'].id,
            systemStock: 38,
            actualStock: 38,
            difference: 0,
          },
          {
            productId: products['LTK-LMP-PHL12'].id,
            systemStock: 105,
            actualStock: 108,
            difference: 3,
            notes: 'Ditemukan 3 unit tidak tercatat',
          },
          {
            productId: products['PPA-RCK-4'].id,
            systemStock: 60,
            actualStock: 59,
            difference: -1,
            notes: 'Selisih 1 batang',
          },
          {
            productId: products['ALT-CKL-01'].id,
            systemStock: 15,
            actualStock: 15,
            difference: 0,
          },
        ],
      },
    },
  }));

  // Stock movements from opname adjustments
  await withRetry(() => prisma.stockMovement.create({
    data: {
      productId: products['SMN-TR-50'].id,
      type: 'OPNAME',
      quantity: -2,
      previousStock: 185,
      newStock: 183,
      referenceType: 'OPNAME',
      referenceId: opname1.id,
      notes: 'Penyesuaian opname OPN-20260320-001',
      createdAt: new Date('2026-03-20T12:00:00+07:00'),
      createdBy: admin.id,
    },
  }));
  await withRetry(() => prisma.stockMovement.create({
    data: {
      productId: products['LTK-LMP-PHL12'].id,
      type: 'OPNAME',
      quantity: 3,
      previousStock: 105,
      newStock: 108,
      referenceType: 'OPNAME',
      referenceId: opname1.id,
      notes: 'Penyesuaian opname OPN-20260320-001',
      createdAt: new Date('2026-03-20T12:00:00+07:00'),
      createdBy: admin.id,
    },
  }));
  await withRetry(() => prisma.stockMovement.create({
    data: {
      productId: products['PPA-RCK-4'].id,
      type: 'OPNAME',
      quantity: -1,
      previousStock: 60,
      newStock: 59,
      referenceType: 'OPNAME',
      referenceId: opname1.id,
      notes: 'Penyesuaian opname OPN-20260320-001',
      createdAt: new Date('2026-03-20T12:00:00+07:00'),
      createdBy: admin.id,
    },
  }));

  console.log('Stock Opname seeded: 1');

  // ==================== PRICE HISTORIES ====================
  const priceHistories = [
    {
      productId: products['SMN-TR-50'].id,
      oldBuy: 63000,
      newBuy: 65000,
      oldSell: 70000,
      newSell: 72000,
      changedBy: admin.id,
      createdAt: new Date('2026-02-01T08:00:00+07:00'),
    },
    {
      productId: products['BSI-BTN-10'].id,
      oldBuy: 80000,
      newBuy: 85000,
      oldSell: 90000,
      newSell: 95000,
      changedBy: admin.id,
      createdAt: new Date('2026-02-15T08:00:00+07:00'),
    },
    {
      productId: products['CAT-DLX-WS5'].id,
      oldBuy: 175000,
      newBuy: 180000,
      oldSell: 205000,
      newSell: 210000,
      changedBy: admin.id,
      createdAt: new Date('2026-03-01T08:00:00+07:00'),
    },
  ];

  for (const ph of priceHistories) {
    await withRetry(() => prisma.priceHistory.create({ data: ph }));
  }

  console.log('Price Histories seeded:', priceHistories.length);

  // ==================== AUDIT LOGS ====================
  const auditLogs = [
    {
      userId: admin.id,
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: po1.id,
      newData: { poNumber: 'PO-20260301-001', supplier: 'Toko Bangunan Makmur', total: 6360000 },
      ipAddress: '192.168.1.10',
      createdAt: new Date('2026-03-01T08:00:00+07:00'),
    },
    {
      userId: admin.id,
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: po1.id,
      oldData: { status: 'DRAFT' },
      newData: { status: 'RECEIVED' },
      ipAddress: '192.168.1.10',
      createdAt: new Date('2026-03-03T10:00:00+07:00'),
    },
    {
      userId: kasir.id,
      action: 'CREATE',
      entity: 'Transaction',
      entityId: trx1.id,
      newData: { transactionNumber: 'TRX-20260305-001', type: 'CASH', total: 504000 },
      ipAddress: '192.168.1.20',
      createdAt: new Date('2026-03-05T08:30:00+07:00'),
    },
    {
      userId: kasir.id,
      action: 'CREATE',
      entity: 'TransactionReturn',
      entityId: retur1.id,
      newData: { returnNumber: 'RET-20260306-001', refundAmount: 144000 },
      ipAddress: '192.168.1.20',
      createdAt: new Date('2026-03-06T09:00:00+07:00'),
    },
    {
      userId: admin.id,
      action: 'CREATE',
      entity: 'Project',
      entityId: projectRenovasi.id,
      newData: { name: 'Renovasi Asrama Putra', budget: 25000000 },
      ipAddress: '192.168.1.10',
      createdAt: new Date('2026-03-15T07:00:00+07:00'),
    },
    {
      userId: admin.id,
      action: 'UPDATE',
      entity: 'Product',
      entityId: products['SMN-TR-50'].id,
      oldData: { buyPrice: 63000, sellPrice: 70000 },
      newData: { buyPrice: 65000, sellPrice: 72000 },
      ipAddress: '192.168.1.10',
      createdAt: new Date('2026-02-01T08:00:00+07:00'),
    },
    {
      userId: admin.id,
      action: 'CREATE',
      entity: 'StockOpname',
      entityId: opname1.id,
      newData: { opnameNumber: 'OPN-20260320-001', itemCount: 6 },
      ipAddress: '192.168.1.10',
      createdAt: new Date('2026-03-20T07:00:00+07:00'),
    },
  ];

  for (const log of auditLogs) {
    await withRetry(() => prisma.auditLog.create({ data: log }));
  }

  console.log('Audit Logs seeded:', auditLogs.length);

  // ==================== NOTIFICATIONS ====================
  const notifications = [
    {
      userId: admin.id,
      title: 'Stok Rendah: Cangkul Biasa',
      message: 'Stok Cangkul Biasa tersisa 15 unit, mendekati batas minimum (3). Segera lakukan restok.',
      type: 'LOW_STOCK',
      status: 'SENT',
      sentAt: new Date('2026-03-20T07:00:00+07:00'),
      createdAt: new Date('2026-03-20T07:00:00+07:00'),
    },
    {
      userId: admin.id,
      title: 'PO Belum Diterima Penuh',
      message: 'Purchase Order PO-20260310-001 dari Toko Besi Jaya masih berstatus PARTIALLY_RECEIVED. Sisa 20 btg Besi Beton 10mm dan 20 kg Paku 5cm belum diterima.',
      type: 'PO_REMINDER',
      status: 'SENT',
      sentAt: new Date('2026-03-25T08:00:00+07:00'),
      createdAt: new Date('2026-03-25T08:00:00+07:00'),
    },
    {
      userId: kasir.id,
      title: 'BON Jatuh Tempo: Pak Dedi',
      message: 'Transaksi BON TRX-20260318-001 atas nama Pak Dedi (Rp 816.000) akan jatuh tempo pada 18 April 2026.',
      type: 'BON_DUE',
      status: 'PENDING',
      createdAt: new Date('2026-04-01T07:00:00+07:00'),
    },
  ];

  for (const notif of notifications) {
    await withRetry(() => prisma.notification.create({ data: notif }));
  }

  console.log('Notifications seeded:', notifications.length);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
