import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Elle Core',
  description: 'Docs for my Hono API',
  base: '/documentation/', // IMPORTANT: if you serve under /docs/
  outDir: '../dist/docs',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'API Reference', link: '/api/' },
    ],
    sidebar: {
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Introduction', link: '/api/' },
            { text: 'Endpoints', link: '/api/endpoints' },
          ],
        },
      ],
    },
    darkModeSwitchLabel: 'Switch to dark mode',
    lightModeSwitchTitle: 'Switch to light mode',
    footer: {
      message: '',
      copyright: 'Copyright © 2026 Zubble Inc.',
    },
  },
  appearance: 'dark',
  head: [['link', { rel: 'icon', href: '/docs/favicon.ico' }]],
  ignoreDeadLinks: true,
  sitemap: { hostname: 'https://your-domain.com' },
});
