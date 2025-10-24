import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setupEnv.js', './test/setupMocks.js'],
    include: ['test/**/*.test.js'],
    server: {
      deps: {
        inline: ['graphql', 'graphql-http'],
        fallbackCJS: true
      }
    },
    deps: {
      optimizer: {
        ssr: {
          include: ['graphql', 'graphql-http']
        }
      },
      interopDefault: true
    }
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json-summary', 'lcov'],
    reportsDirectory: './coverage',
    thresholds: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },
  esbuild: {
    target: 'esnext'
  }
});
