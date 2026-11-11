import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/rls/**/*.rls.ts'],
    // The suites share one local Auth service and seed users in beforeAll;
    // running files one at a time avoids contention on a cold stack.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    exclude: [
      ...configDefaults.exclude,
      '**/.claude/**',
      '**/e2e/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './test/stubs/server-only.ts'),
    },
  },
})
