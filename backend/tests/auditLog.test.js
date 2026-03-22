const request = require('supertest');
const { adminToken, kasirToken, mockPrisma, resetMocks } = require('./helpers/setup');

jest.mock('../src/lib/prisma', () => require('./helpers/setup').mockPrisma);

const app = require('../src/index');

beforeEach(() => resetMocks());

describe('GET /api/audit-logs', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/audit-logs');
    expect(res.status).toBe(401);
  });

  test('should return audit logs with description', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1', action: 'CREATE', entity: 'products', entityId: 'p-1',
        oldData: null, newData: { name: 'Semen Tiga Roda' },
        createdAt: new Date(), user: { id: 'u-1', fullName: 'Admin', email: 'admin@test.com', role: 'ADMIN' },
      },
      {
        id: 'log-2', action: 'LOGIN', entity: null, entityId: null,
        oldData: null, newData: null,
        createdAt: new Date(), user: { id: 'u-1', fullName: 'Admin', email: 'admin@test.com', role: 'ADMIN' },
      },
    ]);
    mockPrisma.auditLog.count.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].description).toContain('Semen Tiga Roda');
    expect(res.body.data[1].description).toBe('Login ke sistem');
  });

  test('should filter by action', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/audit-logs?action=LOGIN')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test('should filter by date range', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/audit-logs?startDate=2026-03-01&endDate=2026-03-22')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/audit-logs/:id', () => {
  test('should return audit log detail', async () => {
    mockPrisma.auditLog.findUnique.mockResolvedValue({
      id: 'log-1', action: 'UPDATE', entity: 'products', entityId: 'p-1',
      oldData: { name: 'Semen Lama' }, newData: { name: 'Semen Baru' },
      createdAt: new Date(), user: { id: 'u-1', fullName: 'Admin', email: 'admin@test.com', role: 'ADMIN' },
    });

    const res = await request(app)
      .get('/api/audit-logs/log-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
