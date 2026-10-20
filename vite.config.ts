import path from 'path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { api_url } from './vite-elli-config.ts';

/** A path separator on either platform, and the rest of one path segment. */
const SEP = String.raw`[\\/]`;
const REST = String.raw`[^\\/]*`;

/** Modules inside any of `names`, directly under a node_modules directory. */
const pkg = (names: string) => new RegExp(`${SEP}node_modules${SEP}(?:${names})${SEP}`);

/**
 * Vendor chunks, by the package directory right after `node_modules`. The first
 * group whose pattern matches a module wins, as the if-chain this replaced did.
 */
const vendorChunks = [
  { name: 'react', test: pkg('react|react-dom|scheduler') },
  { name: 'router', test: pkg(`react-router${REST}`) },
  { name: 'tanstack', test: pkg(`@tanstack|tanstack${REST}`) },
  { name: 'charts', test: pkg(`recharts|d3-${REST}`) },
  { name: 'ui', test: pkg('radix-ui|@radix-ui|@headless-tree|headless-tree|cmdk') },
  { name: 'motion', test: pkg(`motion-${REST}`) },
  { name: 'markdown', test: pkg(`react-markdown|remark${REST}|rehype${REST}`) },
  { name: 'editor', test: pkg('@tiptap') },
  { name: 'helmet', test: pkg('react-helmet-async') },
  { name: 'lucide', test: pkg('lucide-react') },
  { name: 'lgallery', test: pkg('lightgallery') },
  { name: 'analytics', test: pkg('posthog-js|@posthog') },
  { name: 'forms', test: pkg('react-hook-form|@hookform|zod') },
  { name: 'dates', test: pkg('date-fns|react-day-picker') },
];

// https://vite.dev/config/
export default defineConfig({
  build: {
    assetsDir: 'assets',
    cssCodeSplit: true,
    // Rolldown's codeSplitting replaces manualChunks, which Vite 8 deprecates.
    // Static patterns, so Rolldown never calls back into JS per module; modules
    // no group matches are split by its default rules.
    rolldownOptions: {
      output: {
        codeSplitting: { groups: vendorChunks },
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
        // =======DO NOT CHANGE THESE 4 ======= //
        // =======DO NOT CHANGE THESE 4 ======= //
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallbackDenylist: [/^\/api($|\/)/],
        // =======DO NOT CHANGE THE ABOVE 4 ======= //
        // =======DO NOT CHANGE THE ABOVE 4 ======= //
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
        // Forward WebSocket upgrades (email realtime).
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@app': path.resolve(import.meta.dirname, 'src/app'),
      '@core': path.resolve(import.meta.dirname, 'src/core'),
      '@modules': path.resolve(import.meta.dirname, 'src/modules'),
    },
  },
});
