const request = require('supertest');
const { adminToken, kasirToken, viewerToken, mockPrisma, resetMocks } = require('./helpers/setup');

jest.mock('../src/lib/prisma', () => require('./helpers/setup').mockPrisma);

const app = require('../src/index');

beforeEach(() => resetMocks());

const sampleProject = {
  id: 'proj-1', name: 'Renovasi Asrama', description: 'Renovasi lantai 2',
  status: 'PLANNING', budget: 50000000, spent: 0, isActive: true,
  startDate: new Date('2026-03-01'),
  creator: { id: 'user-1', fullName: 'Admin' },
  materials: [{ estimatedQty: 100, usedQty: 30, product: { id: 'p-1', name: 'Semen', unit: 'sak' } }],
  _count: { transactions: 2 },
};

describe('GET /api/projects', () => {
  test('should return 401 without token', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });

  test('should return projects', async () => {
    mockPrisma.project.findMany.mockResolvedValue([sampleProject]);
    mockPrisma.project.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('should support search filter', async () => {
    mockPrisma.project.findMany.mockResolvedValue([sampleProject]);
    mockPrisma.project.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/projects?search=renovasi')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test('should support status filter', async () => {
    mockPrisma.project.findMany.mockResolvedValue([]);
    mockPrisma.project.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/projects?status=PLANNING')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/projects/:id', () => {
  test('should return project by id', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      ...sampleProject,
      budget: 50000000,
      spent: 0,
      updater: null,
      materials: [
        { id: 'm-1', estimatedQty: 100, usedQty: 30, unitPrice: 50000, product: { id: 'p-1', name: 'Semen', sku: 'SMN-001', unit: 'sak', sellPrice: 65000, stock: 100 } },
      ],
      transactions: [],
    });

    const res = await request(app)
      .get('/api/projects/proj-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
  });

  test('should return 404 for non-existent project', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/projects/non-existent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/projects', () => {
  test('should reject VIEWER role', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
  });

  test('should create project successfully', async () => {
    const createdProject = {
      ...sampleProject,
      budget: 50000000,
      spent: 0,
      materials: [],
      transactions: [],
      updater: null,
      creator: { id: 'user-test-1', fullName: 'Admin' },
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        project: {
          create: jest.fn().mockResolvedValue({ id: 'proj-1', name: 'Renovasi Asrama' }),
          findUnique: jest.fn().mockResolvedValue(createdProject),
        },
        projectMaterial: { createMany: jest.fn().mockResolvedValue({}) },
        product: { findMany: jest.fn().mockResolvedValue([]) },
      };
      return fn(tx);
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renovasi Asrama', description: 'Renovasi lantai 2', budget: 50000000 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('KASIR should create project', async () => {
    const createdProject = {
      ...sampleProject,
      budget: 10000000,
      spent: 0,
      materials: [],
      transactions: [],
      updater: null,
      creator: { id: 'user-test-2', fullName: 'Kasir' },
    };
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        project: {
          create: jest.fn().mockResolvedValue({ id: 'proj-1', name: 'Test Project' }),
          findUnique: jest.fn().mockResolvedValue(createdProject),
        },
        projectMaterial: { createMany: jest.fn().mockResolvedValue({}) },
        product: { findMany: jest.fn().mockResolvedValue([]) },
      };
      return fn(tx);
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${kasirToken}`)
      .send({ name: 'Test Project', budget: 10000000 });

    expect(res.status).toBe(201);
  });
});

describe('PUT /api/projects/:id', () => {
  test('should update project', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(sampleProject);
    mockPrisma.project.update.mockResolvedValue({ ...sampleProject, name: 'Updated' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .put('/api/projects/proj-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should return 404 for non-existent project', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/projects/non-existent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/projects/:id', () => {
  test('should delete project', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(sampleProject);
    mockPrisma.project.delete.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/projects/proj-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test('should reject non-ADMIN', async () => {
    const res = await request(app)
      .delete('/api/projects/proj-1')
      .set('Authorization', `Bearer ${kasirToken}`);

    expect(res.status).toBe(403);
  });

  test('should return 404 for non-existent project', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/projects/non-existent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
