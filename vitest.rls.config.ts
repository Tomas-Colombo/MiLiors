import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/rls/**/*.rls.ts'],
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
