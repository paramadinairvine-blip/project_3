const { PrismaClient } = require('@prisma/client');
const whatsappService = require('../services/whatsapp.service');
const stockService = require('../services/stock.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');
const { DEFAULT_PAGE_SIZE } = require('../utils/constants');

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  try {
    const { page, limit, type } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || DEFAULT_PAGE_SIZE;
    const skip = (pageNum - 1) * limitNum;

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
        take: limitNum,
      }),
      prisma.notification.count({ where }),
    ]);

    return paginatedResponse(res, data, total, pageNum, limitNum, 'Daftar notifikasi berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const sendTest = async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone) return errorResponse(res, 'Nomor telepon wajib diisi', 400);

    const result = await whatsappService.sendMessage(
      phone,
      message || 'Test notifikasi dari Sistem Inventori Toko Bangunan'
    );

    if (result === null) {
      return errorResponse(res, 'WhatsApp tidak aktif atau belum terhubung', 503);
    }

    return successResponse(res, { sent: true }, 'Pesan test berhasil dikirim');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const getWhatsAppStatus = async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    return successResponse(res, status, 'Status WhatsApp berhasil diambil');
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

const checkLowStock = async (req, res) => {
  try {
    const lowStockProducts = await stockService.checkLowStock();

    if (lowStockProducts.length === 0) {
      return successResponse(res, { count: 0, products: [] }, 'Tidak ada produk dengan stok di bawah minimum');
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

    return successResponse(
      res,
      {
        count: lowStockProducts.length,
        products: lowStockProducts,
        whatsappSent: !!waResult,
      },
      `Ditemukan ${lowStockProducts.length} produk dengan stok di bawah minimum`
    );
  } catch (err) {
    return errorResponse(res, err.message, err.status || 500);
  }
};

module.exports = { getAll, sendTest, getWhatsAppStatus, checkLowStock };
