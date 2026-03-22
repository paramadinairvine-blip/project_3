const request = require('supertest');
const { adminToken, kasirToken, viewerToken, mockPrisma, resetMocks } = require('./helpers/setup');

jest.mock('../src/lib/prisma', () => require('./helpers/setup').mockPrisma);

const app = require('../src/index');

beforeEach(() => resetMocks());

describe('GET /api/transactions', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
  });

  test('should return transactions', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transaction.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('KASIR should access transactions', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    mockPrisma.transaction.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${kasirToken}`);

    expect(res.status).toBe(200);
  });
});

describe('POST /api/transactions', () => {
  test('should reject VIEWER role', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ type: 'CASH', items: [] });

    expect(res.status).toBe(403);
  });

  test('should reject invalid data (missing type)', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${kasirToken}`)
      .send({ items: [{ productId: 'p-1', quantity: 1 }] });

    expect(res.status).toBe(422);
  });

  test('should reject empty items', async () => {
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${kasirToken}`)
      .send({ type: 'CASH', items: [] });

    expect(res.status).toBe(422);
  });
});
