const request = require('supertest');
const { adminToken, kasirToken, viewerToken, mockPrisma, resetMocks, mockUserFindUnique } = require('./helpers/setup');

jest.mock('../src/lib/prisma', () => require('./helpers/setup').mockPrisma);

const app = require('../src/index');

beforeEach(() => resetMocks());

const sampleUser = {
  id: 'user-1',
  username: 'johndoe',
  email: 'john@example.com',
  fullName: 'John Doe',
  phone: '08123456789',
  role: 'KASIR',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('GET /api/users', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('should reject non-ADMIN roles', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${kasirToken}`);
    expect(res.status).toBe(403);
  });

  test('should return users for ADMIN', async () => {
    mockPrisma.user.findMany.mockResolvedValue([sampleUser]);
    mockPrisma.user.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('should support search query', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/users?search=john')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/users/:id', () => {
  test('should return user by id', async () => {
    mockUserFindUnique(sampleUser);

    const res = await request(app)
      .get('/api/users/user-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('john@example.com');
  });

  test('should return 404 for non-existent user', async () => {
    mockUserFindUnique(null);

    const res = await request(app)
      .get('/api/users/non-existent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/users', () => {
  test('should create user successfully', async () => {
    mockPrisma.user.create.mockResolvedValue(sampleUser);
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'john@example.com',
        password: 'password123',
        fullName: 'John Doe',
        role: 'KASIR',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('should reject KASIR role', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${kasirToken}`)
      .send({ email: 'test@test.com', password: '123456', fullName: 'Test' });

    expect(res.status).toBe(403);
  });

  test('should reject invalid data', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'invalid' });

    expect(res.status).toBe(422);
  });
});

describe('PUT /api/users/:id', () => {
  test('should update user', async () => {
    mockUserFindUnique(sampleUser);
    mockPrisma.user.update.mockResolvedValue({ ...sampleUser, fullName: 'Updated Name' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .put('/api/users/user-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should return 404 for non-existent user', async () => {
    mockUserFindUnique(null);

    const res = await request(app)
      .put('/api/users/non-existent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Test' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/users/:id', () => {
  test('should delete user permanently if no related data', async () => {
    mockUserFindUnique({ ...sampleUser, id: 'user-other' });
    // All relation counts return 0
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.purchaseOrder.count.mockResolvedValue(0);
    mockPrisma.stockOpname.count.mockResolvedValue(0);
    mockPrisma.stockMovement.count.mockResolvedValue(0);
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.product.count.mockResolvedValue(0);
    mockPrisma.transactionReturn.count.mockResolvedValue(0);
    mockPrisma.category.count.mockResolvedValue(0);
    mockPrisma.supplier.count.mockResolvedValue(0);
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/users/user-other')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test('should reject deletion if user has transactions', async () => {
    mockUserFindUnique({ ...sampleUser, id: 'user-other' });
    mockPrisma.transaction.count.mockResolvedValue(5);
    mockPrisma.purchaseOrder.count.mockResolvedValue(0);
    mockPrisma.stockOpname.count.mockResolvedValue(0);
    mockPrisma.stockMovement.count.mockResolvedValue(0);
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.product.count.mockResolvedValue(0);
    mockPrisma.transactionReturn.count.mockResolvedValue(0);
    mockPrisma.category.count.mockResolvedValue(0);
    mockPrisma.supplier.count.mockResolvedValue(0);

    const res = await request(app)
      .delete('/api/users/user-other')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('transaksi');
  });

  test('should reject deletion if user has purchase orders', async () => {
    mockUserFindUnique({ ...sampleUser, id: 'user-other' });
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.purchaseOrder.count.mockResolvedValue(3);
    mockPrisma.stockOpname.count.mockResolvedValue(0);
    mockPrisma.stockMovement.count.mockResolvedValue(0);
    mockPrisma.project.count.mockResolvedValue(0);
    mockPrisma.product.count.mockResolvedValue(0);
    mockPrisma.transactionReturn.count.mockResolvedValue(0);
    mockPrisma.category.count.mockResolvedValue(0);
    mockPrisma.supplier.count.mockResolvedValue(0);

    const res = await request(app)
      .delete('/api/users/user-other')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('purchase order');
  });

  test('should prevent self-deletion', async () => {
    mockUserFindUnique({ ...sampleUser, id: 'user-test-1' });

    const res = await request(app)
      .delete('/api/users/user-test-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });

  test('should reject non-ADMIN', async () => {
    const res = await request(app)
      .delete('/api/users/user-1')
      .set('Authorization', `Bearer ${kasirToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/users/:id/change-password', () => {
  test('should reject short password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(sampleUser);

    const res = await request(app)
      .put('/api/users/user-1/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: '12' });

    expect(res.status).toBe(422);
  });
});
