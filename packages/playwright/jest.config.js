/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Only run TypeScript specs via ts-jest. Compiled .js/.d.ts twins must never
  // be committed under __tests__ or they double-run against stale code.
  testMatch: ['**/__tests__/unit/**/*.spec.ts'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json'
    }
  }
};
