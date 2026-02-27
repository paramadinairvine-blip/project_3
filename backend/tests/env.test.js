/**
 * Tests for environment validation utility.
 */

describe('validateEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  test('should throw when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'test-secret';

    const validateEnv = require('../src/utils/validateEnv');
    expect(() => validateEnv()).toThrow('Missing required environment variables');
    expect(() => validateEnv()).toThrow('DATABASE_URL');
  });

  test('should throw when JWT_SECRET is missing', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    delete process.env.JWT_SECRET;

    const validateEnv = require('../src/utils/validateEnv');
    expect(() => validateEnv()).toThrow('Missing required environment variables');
    expect(() => validateEnv()).toThrow('JWT_SECRET');
  });

  test('should throw listing all missing variables', () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;

    const validateEnv = require('../src/utils/validateEnv');
    expect(() => validateEnv()).toThrow('DATABASE_URL');
  });

  test('should not throw when all required vars are present', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret';

    const validateEnv = require('../src/utils/validateEnv');
    expect(() => validateEnv()).not.toThrow();
  });

  test('should warn about default JWT_SECRET in production', () => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this';
    process.env.NODE_ENV = 'production';

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const validateEnv = require('../src/utils/validateEnv');
    validateEnv();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET is using the default value')
    );
    consoleSpy.mockRestore();
  });
});
