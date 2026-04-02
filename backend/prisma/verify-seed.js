const prisma = require('../src/lib/prisma');

async function verify() {
  console.log('========================================');
  console.log('  VERIFIKASI DATA SEED - TOKO MATERIAL');
  console.log('========================================\n');

  // 1. Count all entities
  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    brands: await prisma.brand.count(),
    units: await prisma.unitOfMeasure.count(),
    unitLembaga: await prisma.unitLembaga.count(),
    suppliers: await prisma.supplier.count(),
    products: await prisma.product.count(),
    purchaseOrders: await prisma.purchaseOrder.count(),
    poItems: await prisma.purchaseOrderItem.count(),
    transactions: await prisma.transaction.count(),
    trxItems: await prisma.transactionItem.count(),
    returns: await prisma.transactionReturn.count(),
    returnItems: await prisma.transactionReturnItem.count(),
    stockMovements: await prisma.stockMovement.count(),
    stockOpnames: await prisma.stockOpname.count(),
    opnameItems: await prisma.stockOpnameItem.count(),
    projects: await prisma.project.count(),
    projectMaterials: await prisma.projectMaterial.count(),
    priceHistories: await prisma.priceHistory.count(),
    auditLogs: await prisma.auditLog.count(),
    notifications: await prisma.notification.count(),
  };

  console.log('--- JUMLAH DATA ---');
  for (const [key, val] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(20)} : ${val}`);
  }

  // 2. Transaction balance check
  console.log('\n--- BALANCE TRANSAKSI ---');
  const transactions = await prisma.transaction.findMany({
    include: { items: true },
  });

  let allTrxBalanced = true;
  for (const trx of transactions) {
    const itemsTotal = trx.items.reduce((sum, i) => sum + Number(i.subtotal), 0);
    const trxSubtotal = Number(trx.subtotal);
    const balanced = Math.abs(itemsTotal - trxSubtotal) < 1;
    if (!balanced) {
      console.log(`  [MISMATCH] ${trx.transactionNumber}: items=${itemsTotal}, subtotal=${trxSubtotal}`);
      allTrxBalanced = false;
    }
  }
  if (allTrxBalanced) {
    console.log('  [OK] Semua transaksi balance (subtotal = sum items)');
  }

  // 3. PO balance check
  console.log('\n--- BALANCE PURCHASE ORDER ---');
  const pos = await prisma.purchaseOrder.findMany({
    include: { items: true },
  });

  let allPoBalanced = true;
  for (const po of pos) {
    const itemsTotal = po.items.reduce((sum, i) => sum + Number(i.subtotal), 0);
    const poTotal = Number(po.totalAmount);
    const balanced = Math.abs(itemsTotal - poTotal) < 1;
    if (!balanced) {
      console.log(`  [MISMATCH] ${po.poNumber}: items=${itemsTotal}, totalAmount=${poTotal}`);
      allPoBalanced = false;
    }
  }
  if (allPoBalanced) {
    console.log('  [OK] Semua PO balance (totalAmount = sum items)');
  }

  // 4. PO status vs received qty
  console.log('\n--- STATUS PO vs RECEIVED QTY ---');
  for (const po of pos) {
    const totalQty = po.items.reduce((s, i) => s + i.quantity, 0);
    const receivedQty = po.items.reduce((s, i) => s + i.receivedQty, 0);
    const pct = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;
    const statusOk =
      (po.status === 'RECEIVED' && receivedQty === totalQty) ||
      (po.status === 'PARTIALLY_RECEIVED' && receivedQty > 0 && receivedQty < totalQty) ||
      (po.status === 'DRAFT' && receivedQty === 0);
    console.log(`  ${po.poNumber}: ${po.status} | received ${receivedQty}/${totalQty} (${pct}%) ${statusOk ? '[OK]' : '[MISMATCH]'}`);
  }

  // 5. Transaction type breakdown
  console.log('\n--- BREAKDOWN TRANSAKSI ---');
  const trxByType = await prisma.transaction.groupBy({
    by: ['type', 'status'],
    _count: true,
    _sum: { total: true },
  });
  for (const g of trxByType) {
    console.log(`  ${g.type} / ${g.status}: ${g._count} transaksi, total Rp ${Number(g._sum.total).toLocaleString('id-ID')}`);
  }

  // 6. Return check
  console.log('\n--- RETUR ---');
  const returns = await prisma.transactionReturn.findMany({
    include: { items: true, transaction: true },
  });
  for (const ret of returns) {
    const itemsTotal = ret.items.reduce((s, i) => s + Number(i.subtotal), 0);
    const refund = Number(ret.refundAmount);
    const balanced = Math.abs(itemsTotal - refund) < 1;
    console.log(`  ${ret.returnNumber}: refund Rp ${refund.toLocaleString('id-ID')} | items total Rp ${itemsTotal.toLocaleString('id-ID')} ${balanced ? '[OK]' : '[MISMATCH]'}`);
    console.log(`    Dari transaksi: ${ret.transaction.transactionNumber}`);
  }

  // 7. Project budget vs spent
  console.log('\n--- PROYEK ---');
  const projects = await prisma.project.findMany({
    include: { materials: true },
  });
  for (const proj of projects) {
    const estCost = proj.materials.reduce((s, m) => s + m.estimatedQty * Number(m.unitPrice), 0);
    console.log(`  ${proj.name} [${proj.status}]`);
    console.log(`    Budget: Rp ${Number(proj.budget).toLocaleString('id-ID')} | Spent: Rp ${Number(proj.spent).toLocaleString('id-ID')}`);
    console.log(`    Estimasi material: Rp ${estCost.toLocaleString('id-ID')} | Materials: ${proj.materials.length} item`);
  }

  // 8. Stock Opname
  console.log('\n--- STOCK OPNAME ---');
  const opnames = await prisma.stockOpname.findMany({
    include: { items: { include: { product: true } } },
  });
  for (const op of opnames) {
    console.log(`  ${op.opnameNumber} [${op.status}]`);
    const withDiff = op.items.filter((i) => i.difference !== 0);
    const noDiff = op.items.filter((i) => i.difference === 0);
    console.log(`    Total items: ${op.items.length} | Cocok: ${noDiff.length} | Selisih: ${withDiff.length}`);
    for (const item of withDiff) {
      console.log(`    - ${item.product.name}: sistem=${item.systemStock}, aktual=${item.actualStock}, selisih=${item.difference}`);
    }
  }

  // 9. Stock movement summary
  console.log('\n--- STOCK MOVEMENT SUMMARY ---');
  const movements = await prisma.stockMovement.groupBy({
    by: ['type'],
    _count: true,
    _sum: { quantity: true },
  });
  for (const m of movements) {
    console.log(`  ${m.type.padEnd(12)}: ${m._count} records, total qty: ${m._sum.quantity}`);
  }

  // 10. Notifications
  console.log('\n--- NOTIFIKASI ---');
  const notifs = await prisma.notification.findMany();
  for (const n of notifs) {
    console.log(`  [${n.status}] ${n.title}`);
  }

  console.log('\n========================================');
  console.log('  VERIFIKASI SELESAI');
  console.log('========================================');
}

verify()
  .catch((e) => {
    console.error('Verify error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
