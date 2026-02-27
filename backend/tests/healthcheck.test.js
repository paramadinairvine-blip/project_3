/**
 * Integration tests for health check and API docs endpoints.
 */
const request = require('supertest');
const express = require('express');

describe('Health Check Endpoint', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  });

  test('GET /api/health should return 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  test('GET /api/health response should have valid ISO timestamp', async () => {
    const res = await request(app).get('/api/health');
    const timestamp = new Date(res.body.timestamp);
    expect(timestamp.toISOString()).toBe(res.body.timestamp);
  });
});

describe('Response Helper', () => {
  let responseHelper;

  beforeAll(() => {
    responseHelper = require('../src/utils/responseHelper');
  });

  test('successResponse should format correctly', () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    responseHelper.successResponse(mockRes, { id: 1 }, 'Test berhasil');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Test berhasil',
        data: { id: 1 },
      })
    );
  });

  test('errorResponse should format correctly', () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    responseHelper.errorResponse(mockRes, 'Gagal', 400);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Gagal',
      })
    );
  });

  test('paginatedResponse should include meta', () => {
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    responseHelper.paginatedResponse(mockRes, [{ id: 1 }], 50, 1, 10, 'Data berhasil');
    expect(mockRes.status).toHaveBeenCalledWith(200);

    const call = mockRes.json.mock.calls[0][0];
    expect(call.success).toBe(true);
    expect(call.data).toHaveLength(1);
    expect(call.pagination).toBeDefined();
    expect(call.pagination.total).toBe(50);
    expect(call.pagination.totalPages).toBe(5);
    expect(call.pagination.hasNextPage).toBe(true);
    expect(call.pagination.hasPrevPage).toBe(false);
  });
});

describe('Logger', () => {
  test('should export a pino logger with required methods', () => {
    const logger = require('../src/utils/logger');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.child).toBe('function');
  });
});
