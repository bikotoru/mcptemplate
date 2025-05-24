/**
 * Setup para tests con Jest
 */

// Mock para el filesystem
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  ensureDir: jest.fn(),
  exists: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
  copy: jest.fn(),
  readJson: jest.fn(),
  writeJson: jest.fn()
}));

// Mock para glob
jest.mock('glob', () => ({
  glob: jest.fn()
}));

// Configuración global para tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};
