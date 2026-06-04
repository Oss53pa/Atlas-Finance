/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import pkg from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/vitest-setup.ts'],
    exclude: [
      'node_modules/**',
      'frontend/**',
      '**/workspace/**',
      'src/components/layout/__tests__/**',
      'e2e/**',
      '.claude/**',           // worktrees de développement Claude
      '**/.claude/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx', 'packages/**/*.ts'],
      exclude: ['**/*.test.*', '**/__tests__/**', '**/test/**', 'src/data/**'],
      thresholds: {
        functions: 80,
        branches: 75,
        lines: 70,
      },
    },
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
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Animation — chunk séparé pour lazy-loading
          if (id.includes('framer-motion')) return 'vendor-animation';
          // Charts — séparés pour éviter de tout charger d'un coup
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
          if (
            id.includes('node_modules/d3/') ||
            id.includes('node_modules/d3-')
          ) return 'vendor-d3';
          if (
            id.includes('node_modules/chart.js') ||
            id.includes('node_modules/react-chartjs')
          ) return 'vendor-chartjs';
          // Infra data
          if (
            id.includes('node_modules/dexie') ||
            id.includes('node_modules/@supabase') ||
            id.includes('node_modules/@tanstack/react-query')
          ) return 'vendor-data';
          // UI libs
          if (id.includes('node_modules/@radix-ui')) return 'vendor-ui';
          // Forms
          if (
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/@hookform') ||
            id.includes('node_modules/zod')
          ) return 'vendor-forms';
          // Utilities
          if (
            id.includes('node_modules/date-fns') ||
            id.includes('node_modules/decimal.js') ||
            id.includes('node_modules/uuid')
          ) return 'vendor-utils';
          // PDF / XLSX
          if (id.includes('node_modules/jspdf')) return 'vendor-pdf';
          if (id.includes('node_modules/xlsx')) return 'vendor-xlsx';
          // Router
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          // React core — VOLONTAIREMENT NON isolé. Isolé dans un chunk 'vendor-react'
          // séparé, celui-ci pouvait s'évaluer APRÈS un chunk lazy (charts) qui appelle
          // React.forwardRef au chargement → "Cannot read properties of undefined
          // (reading 'forwardRef')". En laissant react/react-dom dans le chunk d'entrée
          // (chargé en premier), React est toujours prêt pour les chunks lazy.
          // (pas de return ici pour react/react-dom)
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'recharts',
      'chart.js',
      'react-chartjs-2',
      'd3',
      'dexie',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'xlsx',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'date-fns',
      'decimal.js',
      'uuid',
      'jspdf',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-label',
    ],
  },
})
