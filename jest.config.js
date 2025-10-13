export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['js','mjs'],
  transform: {},
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
};
