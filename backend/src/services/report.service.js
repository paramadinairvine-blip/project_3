const prisma = require('../lib/prisma');
const { format, subMonths, startOfMonth, endOfMonth } = require('date-fns');

// ─── 1. Stock Report ────────────────────────────────────────────────

/**
 * Stock report per product / category.
 *
 * @param {object}  opts
 * @param {string}  [opts.categoryId]
 * @param {boolean} [opts.lowStockOnly=false]
 * @returns {Promise<object>}
 */
const getStockReport = async ({ categoryId, lowStockOnly = false } = {}) => {
  const where = { isActive: true };
  if (categoryId) where.categoryId = categoryId;

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      unitOfMeasure: { select: { id: true, name: true, abbreviation: true } },
    },
    orderBy: { name: 'asc' },
  });

  let items = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category?.name || '-',
    brand: p.brand?.name || '-',
    unit: p.unitOfMeasure?.abbreviation || p.unit,
    stock: p.stock,
    minStock: p.minStock,
    maxStock: p.maxStock,
    buyPrice: Number(p.buyPrice),
    sellPrice: Number(p.sellPrice),
    stockValue: Math.round(p.stock * Number(p.buyPrice)),
    isLowStock: p.stock < p.minStock,
    isOverStock: p.maxStock ? p.stock > p.maxStock : false,
  }));

  if (lowStockOnly) {
    items = items.filter((i) => i.isLowStock);
  }

  const totalItems = items.length;
  const totalStockValue = Math.round(items.reduce((s, i) => s + i.stockValue, 0));
  const lowStockCount = items.filter((i) => i.isLowStock).length;

  return {
    items,
    summary: {
      totalItems,
      totalStockValue,
      lowStockCount,
    },
  };
};

// ─── 2. Financial Report ────────────────────────────────────────────

/**
 * Financial report: purchases, expenditures by type/unit lembaga, outstanding BON.
 */
const getFinancialReport = async ({ startDate, endDate, type } = {}) => {
  const dateFilter = {};
  // Accept both ISO strings (from frontend) and plain dates (YYYY-MM-DD)
  if (startDate) {
    const start = startDate.includes('T') ? new Date(startDate) : new Date(startDate + 'T00:00:00+07:00');
    dateFilter.gte = start;
  }
  if (endDate) {
    const end = endDate.includes('T') ? new Date(endDate) : new Date(endDate + 'T23:59:59.999+07:00');
    dateFilter.lte = end;
  }
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // 2a. Total purchases from received POs
  const poWhere = { status: 'RECEIVED' };
  if (hasDateFilter) poWhere.receivedAt = dateFilter;

  const purchaseAgg = await prisma.purchaseOrder.aggregate({
    where: poWhere,
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  // 2b. All transactions (pendapatan/revenue from POS)
  const txWhere = { status: { not: 'CANCELLED' } };
  if (hasDateFilter) txWhere.createdAt = dateFilter;
  if (type) txWhere.type = type;

  const transactions = await prisma.transaction.findMany({
    where: txWhere,
    select: { type: true, total: true, unitLembagaId: true },
  });

  // 2b-2. Total retur dalam periode yang sama
  const returnWhere = {};
  if (hasDateFilter) returnWhere.createdAt = dateFilter;

  const returnAgg = await prisma.transactionReturn.aggregate({
    where: returnWhere,
    _sum: { refundAmount: true },
  });
  const totalReturn = Number(returnAgg._sum.refundAmount || 0);

  // Summary totals by type
  const cashTotal = Math.round(transactions
    .filter((t) => t.type === 'CASH')
    .reduce((s, t) => s + Number(t.total), 0));
  const bonTotal = Math.round(transactions
    .filter((t) => t.type === 'BON')
    .reduce((s, t) => s + Number(t.total), 0));

  // 2c. Per-cashier daily breakdown
  const txWithCashier = await prisma.transaction.findMany({
    where: txWhere,
    select: { type: true, total: true, createdAt: true, createdBy: true },
  });

  // Get all returns with creator info for the period
  const returnsWithCashier = await prisma.transactionReturn.findMany({
    where: returnWhere,
    select: { refundAmount: true, createdAt: true, createdBy: true },
  });

  // Collect unique user IDs
  const cashierIds = [...new Set([
    ...txWithCashier.filter((t) => t.createdBy).map((t) => t.createdBy),
    ...returnsWithCashier.filter((r) => r.createdBy).map((r) => r.createdBy),
  ])];
  const cashierList = cashierIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: cashierIds } }, select: { id: true, fullName: true } })
    : [];
  const cashierMap = new Map(cashierList.map((u) => [u.id, u.fullName]));

  // Group by cashier + date
  const byCashierDay = {};
  txWithCashier.forEach((t) => {
    const day = format(t.createdAt, 'yyyy-MM-dd');
    const key = `${t.createdBy || 'unknown'}_${day}`;
    if (!byCashierDay[key]) {
      byCashierDay[key] = { cashierId: t.createdBy, date: day, cashTotal: 0, bonTotal: 0, returnTotal: 0, count: 0 };
    }
    const amount = Number(t.total);
    if (t.type === 'CASH') byCashierDay[key].cashTotal += amount;
    else if (t.type === 'BON') byCashierDay[key].bonTotal += amount;
    byCashierDay[key].count += 1;
  });
  returnsWithCashier.forEach((r) => {
    const day = format(r.createdAt, 'yyyy-MM-dd');
    const key = `${r.createdBy || 'unknown'}_${day}`;
    if (!byCashierDay[key]) {
      byCashierDay[key] = { cashierId: r.createdBy, date: day, cashTotal: 0, bonTotal: 0, returnTotal: 0, count: 0 };
    }
    byCashierDay[key].returnTotal += Number(r.refundAmount);
  });

  const perCashier = Object.values(byCashierDay)
    .map((row) => ({
      cashierName: cashierMap.get(row.cashierId) || '-',
      date: row.date,
      cashTotal: row.cashTotal,
      bonTotal: row.bonTotal,
      returnTotal: row.returnTotal,
      netTotal: Math.round(row.cashTotal + row.bonTotal - row.returnTotal),
      transactionCount: row.count,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.cashierName.localeCompare(b.cashierName));

  return {
    summary: {
      totalPurchase: Number(purchaseAgg._sum.totalAmount || 0),
      cashTotal,
      bonTotal,
      totalReturn,
      netRevenue: Math.round(cashTotal + bonTotal - totalReturn),
    },
    perCashier,
  };
};

// ─── 3. Trend Report ────────────────────────────────────────────────

/**
 * Trend report: monthly expenditure, top products, top unit lembaga.
 */
const getTrendReport = async ({ startDate, endDate, groupBy = 'month' } = {}) => {
  const start = startDate ? new Date(startDate) : subMonths(new Date(), 11); // default last 12 months
  const end = endDate ? new Date(endDate) : new Date();

  // 3a. Monthly expenditure trend
  const transactions = await prisma.transaction.findMany({
    where: {
      status: { not: 'CANCELLED' },
      createdAt: { gte: start, lte: end },
    },
    select: { total: true, createdAt: true, type: true },
  });

  // 3a-2. Retur dalam periode
  const trendReturns = await prisma.transactionReturn.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { refundAmount: true, createdAt: true },
  });

  const monthlyMap = {};
  transactions.forEach((t) => {
    const key = format(t.createdAt, 'yyyy-MM');
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, total: 0, returnTotal: 0, count: 0 };
    monthlyMap[key].total = Math.round(monthlyMap[key].total + Number(t.total));
    monthlyMap[key].count += 1;
  });
  trendReturns.forEach((r) => {
    const key = format(r.createdAt, 'yyyy-MM');
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, total: 0, returnTotal: 0, count: 0 };
    monthlyMap[key].returnTotal = Math.round(monthlyMap[key].returnTotal + Number(r.refundAmount));
  });

  const monthlyTrend = Object.values(monthlyMap)
    .map((m) => ({ ...m, netTotal: m.total - m.returnTotal }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 3b. Top 10 most issued products
  const topProducts = await prisma.transactionItem.groupBy({
    by: ['productId'],
    where: {
      transaction: {
        status: { not: 'CANCELLED' },
        createdAt: { gte: start, lte: end },
      },
    },
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  });

  const topProductIds = topProducts.map((tp) => tp.productId);
  const topProductDetails = topProductIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: topProductIds } },
        select: { id: true, name: true, sku: true, unit: true },
      })
    : [];
  const productMap = new Map(topProductDetails.map((p) => [p.id, p]));

  const topProductsFormatted = topProducts.map((tp, idx) => ({
    rank: idx + 1,
    product: productMap.get(tp.productId) || { id: tp.productId, name: '-' },
    totalQuantity: tp._sum.quantity || 0,
    totalValue: Number(tp._sum.subtotal || 0),
  }));

  // 3c. Top unit lembaga by expenditure
  const unitTx = await prisma.transaction.findMany({
    where: {
      status: { not: 'CANCELLED' },
      createdAt: { gte: start, lte: end },
      unitLembagaId: { not: null },
    },
    select: { unitLembagaId: true, total: true },
  });

  const unitTotals = {};
  unitTx.forEach((t) => {
    unitTotals[t.unitLembagaId] = (unitTotals[t.unitLembagaId] || 0) + Number(t.total);
  });

  const unitIds = Object.keys(unitTotals);
  const unitDetails = unitIds.length > 0
    ? await prisma.unitLembaga.findMany({ where: { id: { in: unitIds } } })
    : [];
  const unitNameMap = new Map(unitDetails.map((u) => [u.id, u.name]));

  const topUnits = Object.entries(unitTotals)
    .map(([id, total]) => ({
      unitLembagaId: id,
      unitLembagaName: unitNameMap.get(id) || '-',
      total,
    }))
    .sort((a, b) => b.total - a.total);

  // 3d. Period comparison (current period vs previous period of same length)
  const periodMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - periodMs);
  const prevEnd = new Date(start.getTime() - 1);

  const prevTransactions = await prisma.transaction.findMany({
    where: {
      status: { not: 'CANCELLED' },
      createdAt: { gte: prevStart, lte: prevEnd },
    },
    select: { total: true },
  });

  const currentReturnTotal = Math.round(trendReturns.reduce((s, r) => s + Number(r.refundAmount), 0));
  const currentTotal = Math.round(transactions.reduce((s, t) => s + Number(t.total), 0) - currentReturnTotal);

  const prevReturns = await prisma.transactionReturn.aggregate({
    where: { createdAt: { gte: prevStart, lte: prevEnd } },
    _sum: { refundAmount: true },
  });
  const previousTotal = Math.round(prevTransactions.reduce((s, t) => s + Number(t.total), 0) - Number(prevReturns._sum.refundAmount || 0));
  const changePercent = previousTotal > 0
    ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
    : 0;

  return {
    period: { startDate: start, endDate: end },
    monthlyTrend,
    topProducts: topProductsFormatted,
    topUnits,
    periodComparison: {
      current: { total: currentTotal, count: transactions.length },
      previous: { total: previousTotal, count: prevTransactions.length },
      changePercent,
      direction: currentTotal >= previousTotal ? 'up' : 'down',
    },
  };
};

// ─── 4. Profit & Loss (Laba Rugi) Report ─────────────────────────────

/**
 * Laporan Laba Rugi: Pendapatan - HPP = Laba Kotor.
 */
const getLabaRugiReport = async ({ startDate, endDate } = {}) => {
  const dateFilter = {};
  if (startDate) {
    dateFilter.gte = startDate.includes('T') ? new Date(startDate) : new Date(startDate + 'T00:00:00+07:00');
  }
  if (endDate) {
    dateFilter.lte = endDate.includes('T') ? new Date(endDate) : new Date(endDate + 'T23:59:59.999+07:00');
  }
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // ── A. PENDAPATAN ──────────────────────────────────────
  const txWhere = { status: { not: 'CANCELLED' } };
  if (hasDateFilter) txWhere.createdAt = dateFilter;

  const transactions = await prisma.transaction.findMany({
    where: txWhere,
    select: { type: true, total: true },
  });

  const cashRevenue = Math.round(transactions
    .filter((t) => t.type === 'CASH')
    .reduce((s, t) => s + Number(t.total), 0));
  const bonRevenue = Math.round(transactions
    .filter((t) => t.type === 'BON')
    .reduce((s, t) => s + Number(t.total), 0));

  // Retur
  const returnWhere = {};
  if (hasDateFilter) returnWhere.createdAt = dateFilter;

  const returnAgg = await prisma.transactionReturn.aggregate({
    where: returnWhere,
    _sum: { refundAmount: true },
  });
  const totalReturn = Number(returnAgg._sum.refundAmount || 0);
  const netRevenue = Math.round(cashRevenue + bonRevenue - totalReturn);

  // ── B. HPP (Harga Pokok Penjualan) ────────────────────
  // Query semua TransactionItem dari transaksi yang tidak cancelled, beserta buyPrice dari Product
  const txItemWhere = { transaction: { status: { not: 'CANCELLED' } } };
  if (hasDateFilter) txItemWhere.transaction.createdAt = dateFilter;

  const txItems = await prisma.transactionItem.findMany({
    where: txItemWhere,
    select: {
      quantity: true,
      subtotal: true,
      product: {
        select: {
          id: true,
          name: true,
          buyPrice: true,
          sellPrice: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Hitung total HPP
  let totalHPP = 0;
  const categoryHPPMap = {};
  const productMarginMap = {};

  txItems.forEach((item) => {
    const buyPrice = Number(item.product.buyPrice);
    const hpp = item.quantity * buyPrice;
    totalHPP = Math.round(totalHPP + hpp);

    // HPP per kategori
    const catId = item.product.category?.id || 'uncategorized';
    const catName = item.product.category?.name || 'Tanpa Kategori';
    if (!categoryHPPMap[catId]) {
      categoryHPPMap[catId] = { categoryName: catName, totalHPP: 0, totalRevenue: 0 };
    }
    categoryHPPMap[catId].totalHPP = Math.round(categoryHPPMap[catId].totalHPP + hpp);
    categoryHPPMap[catId].totalRevenue = Math.round(categoryHPPMap[catId].totalRevenue + Number(item.subtotal));

    // Per-product margin aggregation
    const prodId = item.product.id;
    if (!productMarginMap[prodId]) {
      productMarginMap[prodId] = {
        productName: item.product.name,
        buyPrice,
        sellPrice: Number(item.product.sellPrice),
        totalQty: 0,
        totalRevenue: 0,
        totalHPP: 0,
      };
    }
    productMarginMap[prodId].totalQty += item.quantity;
    productMarginMap[prodId].totalRevenue = Math.round(productMarginMap[prodId].totalRevenue + Number(item.subtotal));
    productMarginMap[prodId].totalHPP = Math.round(productMarginMap[prodId].totalHPP + hpp);
  });

  const grossProfit = Math.round(netRevenue - totalHPP);
  const grossMarginPercent = netRevenue > 0
    ? Math.round((grossProfit / netRevenue) * 10000) / 100
    : 0;

  // ── C. HPP per Kategori ────────────────────────────────
  const hppByCategory = Object.values(categoryHPPMap)
    .map((cat) => ({
      ...cat,
      percentage: totalHPP > 0 ? Math.round((cat.totalHPP / totalHPP) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.totalHPP - a.totalHPP);

  // ── D. Top Margin & Low Margin Products ────────────────
  const allProducts = Object.values(productMarginMap).map((p) => ({
    ...p,
    grossProfit: p.totalRevenue - p.totalHPP,
    marginPercent: p.totalRevenue > 0
      ? Math.round(((p.totalRevenue - p.totalHPP) / p.totalRevenue) * 10000) / 100
      : 0,
  }));

  const topMarginProducts = [...allProducts]
    .sort((a, b) => b.marginPercent - a.marginPercent)
    .slice(0, 5);

  const lowMarginProducts = [...allProducts]
    .filter((p) => p.totalQty > 0)
    .sort((a, b) => a.marginPercent - b.marginPercent)
    .slice(0, 5);

  return {
    summary: {
      cashRevenue,
      bonRevenue,
      totalReturn,
      netRevenue,
      totalHPP,
      grossProfit,
      grossMarginPercent,
    },
    hppByCategory,
    topMarginProducts,
    lowMarginProducts,
  };
};

// ─── 5. Dashboard Summary ───────────────────────────────────────────

/**
 * Aggregated data for the main dashboard.
 */
const getDashboardSummary = async ({ startDate, endDate } = {}) => {
  const now = new Date();
  const monthStart = startDate ? new Date(startDate) : startOfMonth(now);
  // Ensure endDate covers the full day (23:59:59.999)
  let monthEnd;
  if (endDate) {
    monthEnd = new Date(endDate);
    monthEnd.setHours(23, 59, 59, 999);
  } else {
    monthEnd = endOfMonth(now);
  }

  // Run all queries in parallel
  const [
    totalProducts,
    stockValueResult,
    monthlyTransactions,
    lowStockProducts,
    activePOs,
    activeProjects,
    sixMonthTransactions,
  ] = await Promise.all([
    // Total active products
    prisma.product.count({ where: { isActive: true } }),

    // Total stock value (stock * buyPrice)
    prisma.product.findMany({
      where: { isActive: true },
      select: { stock: true, buyPrice: true },
    }),

    // Transactions this month
    prisma.transaction.findMany({
      where: {
        status: { not: 'CANCELLED' },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      select: { total: true, type: true },
    }),

    // Products below minimum stock
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true, stock: true, minStock: true, unit: true },
    }),

    // Active POs (DRAFT or SENT)
    prisma.purchaseOrder.count({
      where: { status: { in: ['DRAFT', 'SENT'] } },
    }),

    // Active projects
    prisma.project.count({
      where: { status: { in: ['PLANNING', 'IN_PROGRESS'] }, isActive: true },
    }),

    // Last 6 months of transactions for chart
    prisma.transaction.findMany({
      where: {
        status: { not: 'CANCELLED' },
        createdAt: { gte: subMonths(monthStart, 5) },
      },
      select: { total: true, createdAt: true, type: true },
    }),
  ]);

  // Calculate stock value
  const totalStockValue = Math.round(stockValueResult.reduce(
    (s, p) => s + p.stock * Number(p.buyPrice),
    0
  ));

  // Low stock
  const lowStock = lowStockProducts.filter((p) => p.stock < p.minStock);

  // Monthly retur
  const monthlyReturnAgg = await prisma.transactionReturn.aggregate({
    where: { createdAt: { gte: monthStart, lte: monthEnd } },
    _sum: { refundAmount: true },
    _count: { id: true },
  });
  const monthlyReturnTotal = Number(monthlyReturnAgg._sum.refundAmount || 0);

  // Monthly transaction summary
  const monthlyTotal = Math.round(monthlyTransactions.reduce((s, t) => s + Number(t.total), 0) - monthlyReturnTotal);

  // 6-month chart data (with retur deduction)
  const sixMonthReturns = await prisma.transactionReturn.findMany({
    where: { createdAt: { gte: subMonths(monthStart, 5) } },
    select: { refundAmount: true, createdAt: true },
  });

  const chartMap = {};
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(monthStart, i);
    const key = format(m, 'yyyy-MM');
    chartMap[key] = { month: key, label: format(m, 'MMM yyyy'), total: 0, returnTotal: 0, count: 0 };
  }
  sixMonthTransactions.forEach((t) => {
    const key = format(t.createdAt, 'yyyy-MM');
    if (chartMap[key]) {
      chartMap[key].total = Math.round(chartMap[key].total + Number(t.total));
      chartMap[key].count += 1;
    }
  });
  sixMonthReturns.forEach((r) => {
    const key = format(r.createdAt, 'yyyy-MM');
    if (chartMap[key]) {
      chartMap[key].returnTotal = Math.round(chartMap[key].returnTotal + Number(r.refundAmount));
    }
  });
  const transactionChart = Object.values(chartMap).map((m) => ({
    ...m,
    netTotal: m.total - m.returnTotal,
  }));

  // Top 5 products (by transaction quantity this month)
  const monthItems = await prisma.transactionItem.groupBy({
    by: ['productId'],
    where: {
      transaction: {
        status: { not: 'CANCELLED' },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
    },
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });

  const topIds = monthItems.map((i) => i.productId);
  const topDetails = topIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: topIds } },
        select: { id: true, name: true, sku: true, unit: true },
      })
    : [];
  const topMap = new Map(topDetails.map((p) => [p.id, p]));

  const topProducts = monthItems.map((i, idx) => ({
    rank: idx + 1,
    product: topMap.get(i.productId) || { id: i.productId, name: '-' },
    totalQuantity: i._sum.quantity || 0,
    totalValue: Number(i._sum.subtotal || 0),
  }));

  return {
    totalProducts,
    totalStockValue,
    monthlyTransaction: {
      total: monthlyTotal,
      count: monthlyTransactions.length,
      returnTotal: monthlyReturnTotal,
      returnCount: monthlyReturnAgg._count.id,
    },
    lowStockCount: lowStock.length,
    lowStockItems: lowStock.slice(0, 10), // Top 10 most critical
    activePOs,
    activeProjects,
    charts: {
      transactionTrend: transactionChart,
      topProducts,
    },
  };
};

module.exports = {
  getStockReport,
  getFinancialReport,
  getTrendReport,
  getLabaRugiReport,
  getDashboardSummary,
};
