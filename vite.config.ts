import path from 'path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { api_url } from './vite-elli-config';

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
            if (pkg === 'radix-ui' || pkg === 'headless-tree' || pkg === 'cmdk') return 'ui';
            if (pkg.startsWith('motion-')) return 'motion';
            if (pkg === 'react-markdown' || pkg.startsWith('remark') || pkg.startsWith('rehype'))
              return 'markdown';
            if (pkg === 'tiptap') return 'editor';
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
      registerType: 'prompt',
      injectRegister: false,
      useCredentials: true,
      devOptions: {
        enabled: false,
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallbackDenylist: [/^\/api($|\/)/],
      },
      manifest: {
        name: 'ElliHub',
        short_name: 'ElliHub',
        description:
          'ElliHub is a powerful and user-friendly platform designed to streamline your workflow and enhance productivity.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: '/favicon/favicon-16x16.png',
            sizes: '16x16',
            type: 'image/png',
          },
          {
            src: '/favicon/favicon-32x32.png',
            sizes: '32x32',
            type: 'image/png',
          },
          {
            src: '/favicon/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: api_url,
        // target: 'http://localhost:9000',
        // target: 'https://elli-api-test.zubble.co',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@modules': path.resolve(__dirname, 'src/modules'),
    },
  },
});
