import { zValidator } from '@utils';
import { Hono } from 'hono';

import { QuickBooksCallbackQuerySchema, QuickBooksDisconnectCallbackQuerySchema } from './models';
import { QuickBooksService } from './service';

const app = new Hono();

const redirectResponse = (url: string): Response =>
    new Response(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${url}"></head><body>Redirecting...</body></html>`,
        {
            status: 302,
            headers: {
                Location: url,
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        }
    );

app.get('/quickbooks/callback', zValidator('query', QuickBooksCallbackQuerySchema), async (c) => {
    const result = await QuickBooksService.handleCallback(c.req.valid('query'));

    return redirectResponse(result.redirectUrl);
});

app.get(
    '/quickbooks/disconnect-callback',
    zValidator('query', QuickBooksDisconnectCallbackQuerySchema),
    async (c) => {
        const result = await QuickBooksService.handleDisconnectCallback(c.req.valid('query'));

        return redirectResponse(result.redirectUrl);
    }
);

export default app;
