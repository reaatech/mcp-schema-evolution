import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    passWithNoTests: true,
    coverage: {
      thresholds: {
        lines: 79,
        branches: 65,
        functions: 80,
        statements: 80,
      },
    },
  },
});
