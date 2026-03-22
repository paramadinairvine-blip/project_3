const request = require('supertest');
const { adminToken, kasirToken, viewerToken, mockPrisma, resetMocks } = require('./helpers/setup');

jest.mock('../src/lib/prisma', () => require('./helpers/setup').mockPrisma);

const app = require('../src/index');

beforeEach(() => resetMocks());

const sampleReturn = {
  id: 'ret-1', returnNumber: 'RTN-001', reason: 'Barang rusak',
  totalRefund: 50000, createdAt: new Date().toISOString(),
  transaction: { id: 'tx-1', invoiceNumber: 'INV-001' },
  items: [{ id: 'ri-1', quantity: 1, refundAmount: 50000, product: { name: 'Semen' } }],
};

describe('GET /api/returns', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/returns');
    expect(res.status).toBe(401);
  });

  test('should return returns list', async () => {
    mockPrisma.transactionReturn.findMany.mockResolvedValue([sampleReturn]);
    mockPrisma.transactionReturn.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/returns')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('KASIR should access returns', async () => {
    mockPrisma.transactionReturn.findMany.mockResolvedValue([]);
    mockPrisma.transactionReturn.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/returns')
      .set('Authorization', `Bearer ${kasirToken}`);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/returns/:id', () => {
  test('should return return by id', async () => {
    mockPrisma.transactionReturn.findUnique.mockResolvedValue(sampleReturn);

    const res = await request(app)
      .get('/api/returns/ret-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should return 404 for non-existent return', async () => {
    mockPrisma.transactionReturn.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/returns/non-existent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/returns', () => {
  test('should reject VIEWER role', async () => {
    const res = await request(app)
      .post('/api/returns')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ transactionId: 'tx-1', items: [] });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/returns/transaction/:transactionId', () => {
  test('should return returns for transaction', async () => {
    mockPrisma.transactionReturn.findMany.mockResolvedValue([sampleReturn]);

    const res = await request(app)
      .get('/api/returns/transaction/tx-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
