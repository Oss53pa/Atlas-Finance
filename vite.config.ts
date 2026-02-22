/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/vitest-setup.ts'],
    exclude: [
      'node_modules/**',
      'frontend/**',
      '**/workspace/**',
      'src/components/layout/__tests__/**',
    ],
  },
  root: process.cwd(),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/store': path.resolve(__dirname, './src/store'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@atlas/shared': path.resolve(__dirname, './packages/shared/src'),
      '@atlas/core': path.resolve(__dirname, './packages/core/src'),
      '@atlas/data': path.resolve(__dirname, './packages/data/src'),
    },
  },
  server: {
    port: 5178,
    strictPort: true,
    host: true,
    watch: {
      usePolling: false,
      interval: 300,
    },
    hmr: {
      overlay: true,
    },
    fs: {
      strict: false,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-router': ['react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-label',
          ],
          'vendor-charts': ['recharts', 'chart.js', 'react-chartjs-2', 'd3'],
          'vendor-data': ['dexie', '@supabase/supabase-js', '@tanstack/react-query'],
          'vendor-xlsx': ['xlsx'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-utils': ['date-fns', 'decimal.js', 'uuid'],
          'vendor-pdf': ['jspdf'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
