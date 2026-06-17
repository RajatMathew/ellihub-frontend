import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'Elli Core',
    description: 'Docs for my Hono API',
    base: '/documentation/', // IMPORTANT: if you serve under /docs/
    outDir: '../dist/docs',
    themeConfig: {
        nav: [
            { text: 'Home', link: '/' },
            { text: 'Developer Guide', link: '/developer-guide/' },
            { text: 'API Guide', link: '/api-guide/' },
        ],
        darkModeSwitchLabel: 'Switch to dark mode',
        lightModeSwitchTitle: 'Switch to light mode',
        footer: {
            message: 'Prepared with ❤️ by Mohammed Yasim',
            copyright: 'Copyright © 2026 Zubble Inc.',
        },
    },
    appearance: 'dark',
    head: [['link', { rel: 'icon', href: '/docs/favicon.ico' }]],
    ignoreDeadLinks: true,
    sitemap: { hostname: 'https://your-domain.com' },
});
