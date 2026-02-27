/**
 * Unit tests for service layer functions.
 * These test the service functions in isolation using mocked Prisma client.
 */

// ==================== Category Service Tests ====================

describe('category.service', () => {
  let categoryService;

  beforeEach(() => {
    jest.resetModules();
  });

  test('exports all CRUD functions', () => {
    categoryService = require('../src/services/category.service');
    expect(typeof categoryService.getAll).toBe('function');
    expect(typeof categoryService.getById).toBe('function');
    expect(typeof categoryService.create).toBe('function');
    expect(typeof categoryService.update).toBe('function');
    expect(typeof categoryService.remove).toBe('function');
  });
});

// ==================== Brand Service Tests ====================

describe('brand.service', () => {
  let brandService;

  beforeEach(() => {
    jest.resetModules();
  });

  test('exports all CRUD functions', () => {
    brandService = require('../src/services/brand.service');
    expect(typeof brandService.getAll).toBe('function');
    expect(typeof brandService.getById).toBe('function');
    expect(typeof brandService.create).toBe('function');
    expect(typeof brandService.update).toBe('function');
    expect(typeof brandService.remove).toBe('function');
  });
});

// ==================== Supplier Service Tests ====================

describe('supplier.service', () => {
  let supplierService;

  beforeEach(() => {
    jest.resetModules();
  });

  test('exports all CRUD functions', () => {
    supplierService = require('../src/services/supplier.service');
    expect(typeof supplierService.getAll).toBe('function');
    expect(typeof supplierService.getById).toBe('function');
    expect(typeof supplierService.create).toBe('function');
    expect(typeof supplierService.update).toBe('function');
    expect(typeof supplierService.remove).toBe('function');
  });
});

// ==================== User Service Tests ====================

describe('user.service', () => {
  let userService;

  beforeEach(() => {
    jest.resetModules();
  });

  test('exports all CRUD functions and userSelect', () => {
    userService = require('../src/services/user.service');
    expect(typeof userService.getAll).toBe('function');
    expect(typeof userService.getById).toBe('function');
    expect(typeof userService.create).toBe('function');
    expect(typeof userService.update).toBe('function');
    expect(typeof userService.remove).toBe('function');
    expect(typeof userService.changePassword).toBe('function');
    expect(userService.userSelect).toBeDefined();
    expect(userService.userSelect.id).toBe(true);
    expect(userService.userSelect.password).toBeUndefined();
  });
});

// ==================== Unit Service Tests ====================

describe('unit.service', () => {
  let unitService;

  beforeEach(() => {
    jest.resetModules();
  });

  test('exports all UnitOfMeasure functions', () => {
    unitService = require('../src/services/unit.service');
    expect(typeof unitService.getAllUnits).toBe('function');
    expect(typeof unitService.createUnit).toBe('function');
    expect(typeof unitService.updateUnit).toBe('function');
    expect(typeof unitService.deleteUnit).toBe('function');
  });

  test('exports all UnitLembaga functions', () => {
    unitService = require('../src/services/unit.service');
    expect(typeof unitService.getAllUnitLembaga).toBe('function');
    expect(typeof unitService.createUnitLembaga).toBe('function');
    expect(typeof unitService.updateUnitLembaga).toBe('function');
    expect(typeof unitService.deleteUnitLembaga).toBe('function');
  });
});

// ==================== Notification Service Tests ====================

describe('notification.service', () => {
  let notificationService;

  beforeEach(() => {
    jest.resetModules();
  });

  test('exports all functions', () => {
    notificationService = require('../src/services/notification.service');
    expect(typeof notificationService.getAll).toBe('function');
    expect(typeof notificationService.checkLowStock).toBe('function');
  });
});
