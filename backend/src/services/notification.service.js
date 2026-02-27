const { PrismaClient } = require('@prisma/client');
const stockService = require('./stock.service');
const whatsappService = require('./whatsapp.service');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const prisma = new PrismaClient();

const getAll = async ({ page = 1, limit = DEFAULT_PAGE_SIZE, type } = {}) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (type) where.type = type;

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return { data, total, page, limit };
};

const checkLowStock = async () => {
  const lowStockProducts = await stockService.checkLowStock();

  if (lowStockProducts.length === 0) {
    return { count: 0, products: [], whatsappSent: false };
  }

  // Send WhatsApp notification
  const waResult = await whatsappService.sendLowStockAlert(lowStockProducts);

  // Create in-app notifications for all admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'Peringatan Stok Minimum',
        message: `${lowStockProducts.length} produk memiliki stok di bawah batas minimum.`,
        type: 'LOW_STOCK',
        status: waResult ? 'SENT' : 'PENDING',
        sentAt: waResult ? new Date() : null,
      },
    });
  }

  return {
    count: lowStockProducts.length,
    products: lowStockProducts,
    whatsappSent: !!waResult,
  };
};

module.exports = {
  getAll,
  checkLowStock,
};
