const request = require('supertest');
const { adminToken, kasirToken, viewerToken, mockPrisma, resetMocks } = require('./helpers/setup');

jest.mock('../src/lib/prisma', () => require('./helpers/setup').mockPrisma);

const app = require('../src/index');

beforeEach(() => resetMocks());

const sampleBrand = {
  id: 'b-1', name: 'Tiga Roda', isActive: true,
  _count: { products: 5 },
};

describe('GET /api/brands', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/brands');
    expect(res.status).toBe(401);
  });

  test('should return brands', async () => {
    mockPrisma.brand.findMany.mockResolvedValue([sampleBrand]);
    mockPrisma.brand.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/brands')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/brands/:id', () => {
  test('should return brand by id', async () => {
    mockPrisma.brand.findUnique.mockResolvedValue({
      ...sampleBrand,
      products: [],
      _count: { products: 5 },
    });

    const res = await request(app)
      .get('/api/brands/b-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should return 404 for non-existent brand', async () => {
    mockPrisma.brand.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/brands/non-existent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/brands', () => {
  test('should reject VIEWER role', async () => {
    const res = await request(app)
      .post('/api/brands')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Test Brand' });

    expect(res.status).toBe(403);
  });

  test('should create brand successfully', async () => {
    mockPrisma.brand.create.mockResolvedValue(sampleBrand);
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/brands')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Tiga Roda' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('KASIR should create brand', async () => {
    mockPrisma.brand.create.mockResolvedValue(sampleBrand);
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/brands')
      .set('Authorization', `Bearer ${kasirToken}`)
      .send({ name: 'Test Brand' });

    expect(res.status).toBe(201);
  });
});

describe('PUT /api/brands/:id', () => {
  test('should update brand', async () => {
    mockPrisma.brand.findUnique.mockResolvedValue(sampleBrand);
    mockPrisma.brand.update.mockResolvedValue({ ...sampleBrand, name: 'Updated' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .put('/api/brands/b-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should return 404 for non-existent brand', async () => {
    mockPrisma.brand.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/brands/non-existent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/brands/:id', () => {
  test('should deactivate brand', async () => {
    mockPrisma.brand.findUnique.mockResolvedValue({ ...sampleBrand, _count: { products: 0 } });
    mockPrisma.brand.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/brands/b-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test('should reject non-ADMIN', async () => {
    const res = await request(app)
      .delete('/api/brands/b-1')
      .set('Authorization', `Bearer ${kasirToken}`);

    expect(res.status).toBe(403);
  });
});
