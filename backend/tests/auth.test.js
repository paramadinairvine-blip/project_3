const request = require('supertest');
const express = require('express');
const { authenticate } = require('../src/middlewares/auth');
const { authorize } = require('../src/middlewares/roleGuard');
const jwt = require('jsonwebtoken');

// Setup minimal express app for testing middleware
const createApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

// ==================== Auth Middleware Tests ====================

describe('authenticate middleware', () => {
  const JWT_SECRET = 'test-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  test('should reject request without Authorization header', async () => {
    const app = createApp();
    app.get('/test', authenticate, (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('should reject request with invalid token', async () => {
    const app = createApp();
    app.get('/test', authenticate, (req, res) => res.json({ ok: true }));

    const res = await request(app)
      .get('/test')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('should reject expired token', async () => {
    const app = createApp();
    app.get('/test', authenticate, (req, res) => res.json({ ok: true }));

    const expiredToken = jwt.sign(
      { id: '1', email: 'test@test.com', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '0s' }
    );

    // Wait a tick for expiry
    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  test('should accept valid token and set req.user', async () => {
    const app = createApp();
    app.get('/test', authenticate, (req, res) => res.json({ user: req.user }));

    const token = jwt.sign(
      { id: 'user-1', email: 'admin@test.com', role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe('user-1');
    expect(res.body.user.email).toBe('admin@test.com');
    expect(res.body.user.role).toBe('ADMIN');
  });
});

// ==================== RoleGuard Middleware Tests ====================

describe('authorize middleware', () => {
  test('should reject if no user on request', async () => {
    const app = createApp();
    app.get('/test', authorize('ADMIN'), (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(401);
  });

  test('should reject unauthorized role', async () => {
    const app = createApp();
    app.get('/test', (req, res, next) => {
      req.user = { id: '1', role: 'VIEWER' };
      next();
    }, authorize('ADMIN'), (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(403);
  });

  test('should allow authorized role', async () => {
    const app = createApp();
    app.get('/test', (req, res, next) => {
      req.user = { id: '1', role: 'ADMIN' };
      next();
    }, authorize('ADMIN', 'OPERATOR'), (req, res) => res.json({ ok: true }));

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
