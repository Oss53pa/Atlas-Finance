import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@atlas/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
})
