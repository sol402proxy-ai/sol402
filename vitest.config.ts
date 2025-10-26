import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8',
      lines: 0.85,
      statements: 0.85,
      functions: 0.85,
      branches: 0.75,
    },
  },
});
