import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [
      ...configDefaults.exclude,
      // Git worktrees under .claude/ mirror the whole source tree; without this
      // vitest collects every test twice and resolves the copies against the
      // '@' alias below, which points at this root's src.
      '**/.claude/**',
      // e2e/ is Playwright's (npm run test:e2e). Its .spec.ts files match
      // vitest's default include and throw on test.describe() outside its runner.
      '**/e2e/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Ver test/stubs/server-only.ts.
      'server-only': path.resolve(__dirname, './test/stubs/server-only.ts'),
    },
  },
})
