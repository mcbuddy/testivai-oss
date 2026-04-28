/**
 * Jest test setup
 */

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.TESTIVAI_API_URL = 'http://localhost:3000';

// Global test utilities
(global as any).mockFetch = jest.fn();

// Mock fetch globally
(global as any).fetch = (global as any).mockFetch;
