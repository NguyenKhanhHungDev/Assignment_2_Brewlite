import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://unused:unused@127.0.0.1:5432/brewlite_test',
      JWT_SECRET: process.env.JWT_SECRET ?? 'e2e-test-jwt-secret-only',
    },
  },
});
