const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Toko Material Pesantren API',
      version: '1.0.0',
      description: 'REST API untuk sistem manajemen inventaris dan penjualan material bangunan pesantren.',
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'array', items: {} },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Autentikasi & token management' },
      { name: 'Users', description: 'Manajemen pengguna (ADMIN only)' },
      { name: 'Categories', description: 'Kategori produk' },
      { name: 'Brands', description: 'Brand/merek produk' },
      { name: 'Products', description: 'Produk & varian' },
      { name: 'Suppliers', description: 'Manajemen supplier' },
      { name: 'Units', description: 'Satuan ukur & unit lembaga' },
      { name: 'Transactions', description: 'Transaksi penjualan (Cash/BON/Anggaran)' },
      { name: 'Purchase Orders', description: 'Purchase order ke supplier' },
      { name: 'Stock', description: 'Overview stok & penyesuaian' },
      { name: 'Stock Opname', description: 'Opname stok fisik' },
      { name: 'Projects', description: 'Proyek pembangunan' },
      { name: 'Reports', description: 'Laporan stok, keuangan, tren' },
      { name: 'Notifications', description: 'Notifikasi & WhatsApp' },
      { name: 'Audit Logs', description: 'Log audit perubahan data' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
