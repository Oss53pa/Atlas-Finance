import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const rootDir = path.resolve(__dirname, '../../');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: __dirname,
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@/components': path.resolve(rootDir, 'src/components'),
      '@/pages': path.resolve(rootDir, 'src/pages'),
      '@/hooks': path.resolve(rootDir, 'src/hooks'),
      '@/services': path.resolve(rootDir, 'src/services'),
      '@/store': path.resolve(rootDir, 'src/store'),
      '@/types': path.resolve(rootDir, 'src/types'),
      '@/utils': path.resolve(rootDir, 'src/utils'),
      '@atlas/shared': path.resolve(rootDir, 'packages/shared/src'),
      '@atlas/core': path.resolve(rootDir, 'packages/core/src'),
      '@atlas/data': path.resolve(rootDir, 'packages/data/src'),
    },
  },
  define: {
    'import.meta.env.VITE_DATA_MODE': JSON.stringify('local'),
  },
  server: {
    port: 5181,
    strictPort: true,
    host: true,
    fs: {
      strict: false,
      allow: [rootDir],
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
});
