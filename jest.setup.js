// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables
process.env.TWELVE_DATA_API_KEY = 'test-api-key';
process.env.ALPHA_VANTAGE_API_KEY = 'test-alpha-vantage-key';
process.env.FINNHUB_API_KEY = 'test-finnhub-key';
process.env.POLYGON_API_KEY = 'test-polygon-key';

// Mock fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};