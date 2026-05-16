module.exports = {
  testEnvironment: 'node',
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  restoreMocks: true,
  coveragePathIgnorePatterns: ['node_modules', 'dist/config', 'dist/app.js'],
  coverageReporters: ['text', 'lcov', 'clover', 'html'],
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  transform: { '\\.ts$': ['ts-jest'] },
};
