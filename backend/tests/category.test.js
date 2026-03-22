const request = require('supertest');
const { adminToken, kasirToken, viewerToken, mockPrisma, resetMocks } = require('./helpers/setup');

jest.mock('../src/lib/prisma', () => require('./helpers/setup').mockPrisma);

const app = require('../src/index');

beforeEach(() => resetMocks());

const sampleCategory = {
  id: 'cat-1', name: 'Semen', description: 'Kategori semen',
  parentId: null, isActive: true, children: [], _count: { products: 5 },
};

describe('GET /api/categories', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
  });

  test('should return categories', async () => {
    mockPrisma.category.findMany.mockResolvedValue([sampleCategory]);

    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('GET /api/categories/:id', () => {
  test('should return category by id', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({
      ...sampleCategory,
      parent: null,
      products: [],
      _count: { products: 5, children: 0 },
    });

    const res = await request(app)
      .get('/api/categories/cat-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should return 404 for non-existent category', async () => {
    mockPrisma.category.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/categories/non-existent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/categories', () => {
  test('should reject VIEWER role', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
  });

  test('should reject invalid data (short name)', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X' });

    expect(res.status).toBe(422);
  });

  test('should create category successfully', async () => {
    mockPrisma.category.create.mockResolvedValue({ ...sampleCategory, parent: null });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Semen', description: 'Kategori semen' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('should create sub-category with valid parentId', async () => {
    mockPrisma.category.findUnique.mockResolvedValue(sampleCategory);
    mockPrisma.category.create.mockResolvedValue({ ...sampleCategory, id: 'cat-2', parentId: 'cat-1', parent: { id: 'cat-1', name: 'Semen' } });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Semen Portland', parentId: 'cat-1' });

    expect(res.status).toBe(201);
  });
});

describe('PUT /api/categories/:id', () => {
  test('should update category', async () => {
    mockPrisma.category.findUnique.mockResolvedValue(sampleCategory);
    mockPrisma.category.update.mockResolvedValue({ ...sampleCategory, name: 'Updated', parent: null });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .put('/api/categories/cat-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should reject self-referencing parent', async () => {
    mockPrisma.category.findUnique.mockResolvedValue(sampleCategory);

    const res = await request(app)
      .put('/api/categories/cat-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Semen', parentId: 'cat-1' });

    expect(res.status).toBe(400);
  });

  test('should return 404 for non-existent category', async () => {
    mockPrisma.category.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/categories/non-existent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Category' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/categories/:id', () => {
  test('should deactivate category', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ ...sampleCategory, _count: { children: 0, products: 0 } });
    mockPrisma.category.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/categories/cat-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test('should reject if has children', async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ ...sampleCategory, _count: { children: 2, products: 0 } });

    const res = await request(app)
      .delete('/api/categories/cat-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  test('should reject non-ADMIN', async () => {
    const res = await request(app)
      .delete('/api/categories/cat-1')
      .set('Authorization', `Bearer ${kasirToken}`);

    expect(res.status).toBe(403);
  });
});
