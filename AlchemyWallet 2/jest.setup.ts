// Global test setup
import { jest } from '@jest/globals';

// Mock environment variables for tests
process.env.ALCHEMY_API_KEY = 'test-api-key-mock';

// Global mocks that might be needed across tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  // Mock console.error to avoid noise in test output unless we're specifically testing error logging
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};