const prisma = require('../lib/prisma');
const stockService = require('./stock.service');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

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
    return { count: 0, products: [] };
  }

  // Create in-app notifications for all admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  });

  if (admins.length > 0) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: 'Peringatan Stok Minimum',
        message: `${lowStockProducts.length} produk memiliki stok di bawah batas minimum.`,
        type: 'LOW_STOCK',
        status: 'PENDING',
      })),
    });
  }

  return {
    count: lowStockProducts.length,
    products: lowStockProducts,
  };
};

const getMyNotifications = async (userId, { page = 1, limit = DEFAULT_PAGE_SIZE } = {}) => {
  const skip = (page - 1) * limit;

  const where = { userId };

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { data, total, unreadCount, page, limit };
};

const markAsRead = async (id, userId) => {
  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });

  if (!notification) {
    const AppError = require('../utils/AppError');
    throw new AppError('Notifikasi tidak ditemukan', 404);
  }

  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
};

const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};

module.exports = {
  getAll,
  checkLowStock,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
