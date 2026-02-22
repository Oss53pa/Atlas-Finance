/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vite config for the SaaS build (`apps/web`).
 *
 * This is a thin wrapper that builds the same React app as the root,
 * but with VITE_DATA_MODE forced to "saas" so the DataContext picks
 * the SupabaseAdapter instead of DexieAdapter.
 */

// Absolute path to the monorepo root
const monoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],

  // The root for index.html resolution — this app folder
  root: __dirname,

  resolve: {
    alias: {
      // Mirror root aliases, pointing at the shared `src/`
      '@': path.resolve(monoRoot, 'src'),
      '@/components': path.resolve(monoRoot, 'src/components'),
      '@/pages': path.resolve(monoRoot, 'src/pages'),
      '@/hooks': path.resolve(monoRoot, 'src/hooks'),
      '@/services': path.resolve(monoRoot, 'src/services'),
      '@/store': path.resolve(monoRoot, 'src/store'),
      '@/types': path.resolve(monoRoot, 'src/types'),
      '@/utils': path.resolve(monoRoot, 'src/utils'),
      // Monorepo packages
      '@atlas/shared': path.resolve(monoRoot, 'packages/shared/src'),
      '@atlas/core': path.resolve(monoRoot, 'packages/core/src'),
      '@atlas/data': path.resolve(monoRoot, 'packages/data/src'),
    },
  },

  // Force SaaS data mode at compile time
  define: {
    'import.meta.env.VITE_DATA_MODE': JSON.stringify('saas'),
  },

  server: {
    port: 5180,
    strictPort: true,
    host: true,
    fs: {
      // Allow serving files from the monorepo root (shared src/)
      allow: [monoRoot],
      strict: false,
    },
    watch: {
      usePolling: false,
      interval: 300,
    },
    hmr: {
      overlay: true,
    },
  },

  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
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
          'vendor-data': ['@supabase/supabase-js', '@tanstack/react-query'],
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
