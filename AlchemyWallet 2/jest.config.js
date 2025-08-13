export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 10000,
  collectCoverage: false, // Only collect when explicitly requested
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  collectCoverageFrom: [
    'server/**/*.{ts,js}',
    '!server/**/*.test.{ts,js}',
    '!server/**/__tests__/**',
    '!server/**/node_modules/**',
  ],
};