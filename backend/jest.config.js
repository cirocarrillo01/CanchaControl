export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  moduleFileExtensions: ["js", "mjs"],
  transform: {
    "^.+\\.m?js$": ["babel-jest", { presets: [["@babel/preset-env", { targets: { node: "current" } }]] }],
  },
  setupFiles: ["<rootDir>/tests/setup.js"],
  testTimeout: 10000,
};
