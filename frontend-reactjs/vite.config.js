import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const basePath = process.env.VITE_BASE_PATH || process.env.BASE_PATH || './';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setupTests.js',
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules', 'dist']
    }
  }
});
