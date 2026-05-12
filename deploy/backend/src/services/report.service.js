const prisma = require('../config/database');
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
    stockValue: p.stock * Number(p.buyPrice),
    isLowStock: p.stock < p.minStock,
    isOverStock: p.maxStock ? p.stock > p.maxStock : false,
  }));

  if (lowStockOnly) {
    items = items.filter((i) => i.isLowStock);
  }

  const totalItems = items.length;
  const totalStockValue = items.reduce((s, i) => s + i.stockValue, 0);
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
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // 2a. Total purchases from received POs
  const poWhere = { status: 'RECEIVED' };
  if (hasDateFilter) poWhere.receivedAt = dateFilter;

  const purchaseAgg = await prisma.purchaseOrder.aggregate({
    where: poWhere,
    _sum: { totalAmount: true },
    _count: { id: true },
  });

  // 2b. Expenditures per transaction type
  const txWhere = { status: { not: 'CANCELLED' } };
  if (hasDateFilter) txWhere.createdAt = dateFilter;
  if (type) txWhere.type = type;

  const transactions = await prisma.transaction.findMany({
    where: txWhere,
    select: { type: true, total: true, unitLembagaId: true, status: true },
  });

  const byType = { CASH: 0, BON: 0, ANGGARAN: 0 };
  transactions.forEach((t) => {
    byType[t.type] = (byType[t.type] || 0) + Number(t.total);
  });

  const expenditureByType = [
    { type: 'CASH', label: 'Tunai', total: byType.CASH },
    { type: 'BON', label: 'Bon', total: byType.BON },
    { type: 'ANGGARAN', label: 'Anggaran', total: byType.ANGGARAN },
  ];

  // 2c. Expenditures per unit lembaga
  const unitLembagaIds = [...new Set(transactions.filter((t) => t.unitLembagaId).map((t) => t.unitLembagaId))];
  const unitLembagaList = unitLembagaIds.length > 0
    ? await prisma.unitLembaga.findMany({ where: { id: { in: unitLembagaIds } } })
    : [];
  const unitMap = new Map(unitLembagaList.map((u) => [u.id, u.name]));

  const byUnit = {};
  transactions.forEach((t) => {
    if (t.unitLembagaId) {
      byUnit[t.unitLembagaId] = (byUnit[t.unitLembagaId] || 0) + Number(t.total);
    }
  });

  const expenditureByUnit = Object.entries(byUnit).map(([id, total]) => ({
    unitLembagaId: id,
    unitLembagaName: unitMap.get(id) || '-',
    total,
  }));

  // 2d. Outstanding BON
  const outstandingBon = await prisma.transaction.findMany({
    where: { type: 'BON', status: 'PENDING' },
    select: {
      id: true,
      transactionNumber: true,
      customerName: true,
      total: true,
      paidAmount: true,
      dueDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const outstandingTotal = outstandingBon.reduce(
    (s, b) => s + (Number(b.total) - Number(b.paidAmount)),
    0
  );

  return {
    period: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    purchases: {
      totalAmount: Number(purchaseAgg._sum.totalAmount || 0),
      count: purchaseAgg._count.id,
    },
    expenditureByType,
    expenditureByUnit,
    totalExpenditure: expenditureByType.reduce((s, e) => s + e.total, 0),
    outstandingBon: {
      count: outstandingBon.length,
      totalOutstanding: outstandingTotal,
      items: outstandingBon.map((b) => ({
        ...b,
        total: Number(b.total),
        paidAmount: Number(b.paidAmount),
        remaining: Number(b.total) - Number(b.paidAmount),
      })),
    },
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

  const monthlyMap = {};
  transactions.forEach((t) => {
    const key = format(t.createdAt, 'yyyy-MM');
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, total: 0, count: 0 };
    monthlyMap[key].total += Number(t.total);
    monthlyMap[key].count += 1;
  });

  const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

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

  const currentTotal = transactions.reduce((s, t) => s + Number(t.total), 0);
  const previousTotal = prevTransactions.reduce((s, t) => s + Number(t.total), 0);
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

// ─── 4. Dashboard Summary ───────────────────────────────────────────

/**
 * Aggregated data for the main dashboard.
 */
const getDashboardSummary = async () => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

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
  const totalStockValue = stockValueResult.reduce(
    (s, p) => s + p.stock * Number(p.buyPrice),
    0
  );

  // Low stock
  const lowStock = lowStockProducts.filter((p) => p.stock < p.minStock);

  // Monthly transaction summary
  const monthlyTotal = monthlyTransactions.reduce((s, t) => s + Number(t.total), 0);

  // 6-month chart data
  const chartMap = {};
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(monthStart, i);
    const key = format(m, 'yyyy-MM');
    chartMap[key] = { month: key, label: format(m, 'MMM yyyy'), total: 0, count: 0 };
  }
  sixMonthTransactions.forEach((t) => {
    const key = format(t.createdAt, 'yyyy-MM');
    if (chartMap[key]) {
      chartMap[key].total += Number(t.total);
      chartMap[key].count += 1;
    }
  });
  const transactionChart = Object.values(chartMap);

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
  getDashboardSummary,
};
