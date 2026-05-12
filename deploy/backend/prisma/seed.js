const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ==================== USERS ====================
  const hashedAdmin = await bcrypt.hash('admin123', 10);
  const hashedOperator = await bcrypt.hash('operator123', 10);
  const hashedViewer = await bcrypt.hash('viewer123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pesantren.id' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@pesantren.id',
      password: hashedAdmin,
      fullName: 'Administrator',
      phone: '081234567890',
      role: 'ADMIN',
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@pesantren.id' },
    update: {},
    create: {
      username: 'operator',
      email: 'operator@pesantren.id',
      password: hashedOperator,
      fullName: 'Operator Toko',
      phone: '081234567891',
      role: 'OPERATOR',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@pesantren.id' },
    update: {},
    create: {
      username: 'viewer',
      email: 'viewer@pesantren.id',
      password: hashedViewer,
      fullName: 'Pimpinan Pesantren',
      phone: '081234567892',
      role: 'VIEWER',
    },
  });

  console.log('Users seeded:', { admin: admin.id, operator: operator.id, viewer: viewer.id });

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
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        createdBy: admin.id,
      },
    });
    categories[cat.name] = parent;

    for (const childName of cat.children) {
      const child = await prisma.category.create({
        data: {
          name: childName,
          parentId: parent.id,
          createdBy: admin.id,
        },
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
    const brand = await prisma.brand.create({ data: { name } });
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
    const unit = await prisma.unitOfMeasure.create({ data: u });
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
    await prisma.unitLembaga.create({ data: { name } });
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
    const supplier = await prisma.supplier.create({
      data: { ...s, createdBy: admin.id },
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

  let productCount = 0;
  for (const p of productData) {
    await prisma.product.create({
      data: {
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
    });
    productCount++;
  }

  console.log('Products seeded:', productCount);

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
