module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
  // Add coverage settings if needed
  // collectCoverage: true,
  // collectCoverageFrom: ['**/*.js', '!**/node_modules/**', '!**/jest.*.js'],
};
