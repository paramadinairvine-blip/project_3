const request = require('supertest');
const express = require('express');
const {
  validateLogin,
  validateUser,
  validateProduct,
  validateTransaction,
  validateSupplier,
  validateCategory,
  validateChangePassword,
} = require('../src/middlewares/validator');

const createApp = (validator) => {
  const app = express();
  app.use(express.json());
  app.post('/test', validator, (req, res) => res.json({ success: true }));
  return app;
};

// ==================== Login Validation ====================

describe('validateLogin', () => {
  const app = createApp(validateLogin);

  test('should reject empty body', async () => {
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('should reject invalid email', async () => {
    const res = await request(app).post('/test').send({
      email: 'not-an-email',
      password: '123456',
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });

  test('should reject short password', async () => {
    const res = await request(app).post('/test').send({
      email: 'test@test.com',
      password: '123',
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  test('should pass with valid data', async () => {
    const res = await request(app).post('/test').send({
      email: 'admin@pesantren.id',
      password: 'admin123',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ==================== Category Validation ====================

describe('validateCategory', () => {
  const app = createApp(validateCategory);

  test('should reject empty name', async () => {
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(422);
  });

  test('should reject short name', async () => {
    const res = await request(app).post('/test').send({ name: 'A' });
    expect(res.status).toBe(422);
  });

  test('should pass with valid name', async () => {
    const res = await request(app).post('/test').send({ name: 'Material Bangunan' });
    expect(res.status).toBe(200);
  });
});

// ==================== Product Validation ====================

describe('validateProduct', () => {
  const app = createApp(validateProduct);

  test('should reject without name and categoryId', async () => {
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });

  test('should reject negative buyPrice', async () => {
    const res = await request(app).post('/test').send({
      name: 'Semen',
      categoryId: 'cat-1',
      buyPrice: -100,
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'buyPrice')).toBe(true);
  });

  test('should pass with valid data', async () => {
    const res = await request(app).post('/test').send({
      name: 'Semen Tiga Roda 50kg',
      categoryId: 'cat-1',
      buyPrice: 55000,
      sellPrice: 60000,
    });
    expect(res.status).toBe(200);
  });
});

// ==================== Transaction Validation ====================

describe('validateTransaction', () => {
  const app = createApp(validateTransaction);

  test('should reject empty items', async () => {
    const res = await request(app).post('/test').send({
      type: 'CASH',
      items: [],
    });
    expect(res.status).toBe(422);
  });

  test('should reject invalid type', async () => {
    const res = await request(app).post('/test').send({
      type: 'INVALID',
      items: [{ productId: 'p-1', quantity: 1, price: 1000 }],
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'type')).toBe(true);
  });

  test('should reject item with zero quantity', async () => {
    const res = await request(app).post('/test').send({
      type: 'CASH',
      items: [{ productId: 'p-1', quantity: 0, price: 1000 }],
    });
    expect(res.status).toBe(422);
  });

  test('should pass with valid transaction', async () => {
    const res = await request(app).post('/test').send({
      type: 'CASH',
      items: [
        { productId: 'p-1', quantity: 5, price: 10000 },
        { productId: 'p-2', quantity: 2, price: 25000 },
      ],
    });
    expect(res.status).toBe(200);
  });
});

// ==================== Supplier Validation ====================

describe('validateSupplier', () => {
  const app = createApp(validateSupplier);

  test('should reject without name and phone', async () => {
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBe(2);
  });

  test('should pass with valid data', async () => {
    const res = await request(app).post('/test').send({
      name: 'CV Material Jaya',
      phone: '081234567890',
    });
    expect(res.status).toBe(200);
  });
});

// ==================== Change Password Validation ====================

describe('validateChangePassword', () => {
  const app = createApp(validateChangePassword);

  test('should reject empty passwords', async () => {
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });

  test('should reject short new password', async () => {
    const res = await request(app).post('/test').send({
      currentPassword: 'oldpass',
      newPassword: '123',
    });
    expect(res.status).toBe(422);
  });

  test('should pass with valid data', async () => {
    const res = await request(app).post('/test').send({
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123',
    });
    expect(res.status).toBe(200);
  });
});
