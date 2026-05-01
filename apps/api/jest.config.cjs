/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  // Tests live under src/**/__tests__ — keeps source and test files colocated.
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.js"],
  // Babel transforms ESM imports + dynamic syntax so jest.mock works as expected.
  transform: { "^.+\\.js$": "babel-jest" },
  // Resolve the ".js" suffixes our source files use for ESM-style relative imports.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFiles: ["<rootDir>/src/__tests__/setup.env.cjs"],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
  verbose: true,
};
