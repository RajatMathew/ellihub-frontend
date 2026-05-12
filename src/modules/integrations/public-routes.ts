import { zValidator } from '@utils';
import { Hono } from 'hono';

import { QuickBooksCallbackQuerySchema, QuickBooksDisconnectCallbackQuerySchema } from './models';
import { QuickBooksService } from './service';

const app = new Hono();

/**
 * Return a 302 redirect with a minimal HTML body so the browser never
 * flashes an empty page or raw JSON while it follows the Location header.
 */
const redirectResponse = (url: string): Response =>
    new Response(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${url}"></head><body>Redirecting\u2026</body></html>`,
        {
            status: 302,
            headers: {
                Location: url,
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
            },
        }
    );

/**
 * OAuth callback — Intuit redirects the user's browser here after authorization.
 *
 * This must be public because the redirect hits the backend domain directly
 * and the user's session cookie is on the frontend domain (cross-domain).
 * Security is maintained through the cryptographic state parameter which is
 * stored server-side, single-use, and tied to the initiating user.
 */
app.get('/quickbooks/callback', zValidator('query', QuickBooksCallbackQuerySchema), async (c) => {
    const result = await QuickBooksService.handleCallback(c.req.valid('query'));

    return redirectResponse(result.redirectUrl);
});

/**
 * Public disconnect callback — Intuit redirects the user's browser here
 * when they disconnect the app from QuickBooks Online App Center.
 *
 * No authentication required because the redirect originates from Intuit's
 * domain and the user may not have an active session in our app.
 *
 * Configure this URL in the Intuit Developer Portal → App URLs → Disconnect URL:
 *   https://<host>/api/v1/integrations/quickbooks/disconnect-callback?realmId=
 */
app.get(
    '/quickbooks/disconnect-callback',
    zValidator('query', QuickBooksDisconnectCallbackQuerySchema),
    async (c) => {
        const result = await QuickBooksService.handleDisconnectCallback(c.req.valid('query'));

        return redirectResponse(result.redirectUrl);
    }
);

export default app;
