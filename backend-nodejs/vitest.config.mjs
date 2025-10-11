import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setupEnv.js', './test/setupMocks.js'],
    include: ['test/**/*.test.js']
  }
});
