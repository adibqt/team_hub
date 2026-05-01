// Use next/jest so SWC handles JSX, the @/* alias, and CSS imports —
// keeps the test pipeline aligned with the app's runtime build.
const nextJest = require("next/jest.js");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{js,jsx}"],
  clearMocks: true,
};

module.exports = createJestConfig(customJestConfig);
