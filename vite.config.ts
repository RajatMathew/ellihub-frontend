import path from 'path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  build: {
    assetsDir: 'assets',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            const match = id.match(/node_modules[\\/](@?[^\\/]+)/);
            const pkg = match ? match[1].replace('@', '') : '';

            if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler') return 'react';
            if (pkg.startsWith('react-router')) return 'router';
            if (pkg.startsWith('tanstack')) return 'tanstack';
            if (pkg === 'recharts' || pkg.startsWith('d3-')) return 'charts';
            if (pkg === 'react-helmet-async') return 'helmet';
            if (pkg === 'lucide-react') return 'lucide';
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 1024,
    // Remove
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        // drop_console: true, // removes all console methods, including error/warn
        drop_debugger: true,
        passes: 3,
        pure_funcs: ['console.log'], // ONLY removes log, keeps error/warn
      },
      mangle: true,
      format: {
        comments: false,
        ascii_only: true,
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      devOptions: {
        enabled: false,
      },
      manifest: {
        name: 'Elle Hub',
        short_name: 'Elle',
        description: 'construction company erp',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg',
            type: 'image/svg+xml',
            sizes: 'any',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@modules': path.resolve(__dirname, 'src/modules'),
    },
  },
});
