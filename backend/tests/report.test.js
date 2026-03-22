const request = require('supertest');
const { adminToken, mockPrisma, resetMocks } = require('./helpers/setup');

jest.mock('../src/lib/prisma', () => require('./helpers/setup').mockPrisma);

const app = require('../src/index');

beforeEach(() => resetMocks());

describe('GET /api/reports/stock', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/reports/stock');
    expect(res.status).toBe(401);
  });

  test('should return stock report', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'p-1', name: 'Semen', sku: 'SMN-001', stock: 100, minStock: 10, maxStock: 500,
        buyPrice: 50000, sellPrice: 65000, unit: 'sak', isActive: true,
        category: { id: 'c-1', name: 'Semen' },
        brand: { id: 'b-1', name: 'TR' },
        unitOfMeasure: { id: 'u-1', name: 'Sak', abbreviation: 'sak' },
      },
    ]);

    const res = await request(app)
      .get('/api/reports/stock')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('summary');
  });
});

describe('GET /api/reports/financial', () => {
  test('should return financial report', async () => {
    mockPrisma.purchaseOrder.aggregate.mockResolvedValue({ _sum: { totalAmount: 0 }, _count: { id: 0 } });
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transactionReturn.aggregate.mockResolvedValue({ _sum: { refundAmount: 0 } });
    mockPrisma.transactionReturn.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/reports/financial')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
  });
});

describe('GET /api/reports/laba-rugi', () => {
  test('should return profit loss report', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transactionReturn.aggregate.mockResolvedValue({ _sum: { refundAmount: 0 } });
    mockPrisma.transactionItem.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/reports/laba-rugi')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
  });
});

describe('GET /api/reports/trend', () => {
  test('should return trend report', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transactionReturn.findMany.mockResolvedValue([]);
    mockPrisma.transactionReturn.aggregate.mockResolvedValue({ _sum: { refundAmount: 0 } });
    mockPrisma.transactionItem.groupBy.mockResolvedValue([]);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.unitLembaga.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/reports/trend')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/reports/dashboard', () => {
  test('should return dashboard summary', async () => {
    mockPrisma.product.count.mockResolvedValue(10);
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.purchaseOrder.count.mockResolvedValue(2);
    mockPrisma.project.count.mockResolvedValue(1);
    mockPrisma.transactionReturn.aggregate.mockResolvedValue({ _sum: { refundAmount: 0 }, _count: { id: 0 } });
    mockPrisma.transactionReturn.findMany.mockResolvedValue([]);
    mockPrisma.transactionItem.groupBy.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
