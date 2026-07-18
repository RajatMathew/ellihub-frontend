import { success, zValidator } from '@utils';
import { Hono } from 'hono';

import { AurinkoWebhookSchema, AuthCallbackQuerySchema } from './models';
import { EmailService } from './service';

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

const getAurinkoAuthCallbackUrl = (requestUrl: string): string => {
    const request = new URL(requestUrl);
    const aurinkoBaseUrl = process.env.AURINKO_BASE_URL?.trim() || 'https://api.aurinko.io';
    const callbackUrl = new URL('/v1/auth/callback', aurinkoBaseUrl);
    callbackUrl.search = request.search;
    return callbackUrl.toString();
};

app.get('/auth/callback', zValidator('query', AuthCallbackQuerySchema), async (c) => {
    const query = c.req.valid('query');

    try {
        const result = await EmailService.handleCallback(query);
        return redirectResponse(result.redirectUrl);
    } catch (error) {
        const redirectUrl = await EmailService.getAuthFailureRedirectUrl(query, error);
        return redirectResponse(redirectUrl);
    }
});

app.get('/auth/google/callback', (c) => redirectResponse(getAurinkoAuthCallbackUrl(c.req.url)));

app.post('/webhooks/aurinko', async (c) => {
    const secret =
        process.env.AURINKO_WEBHOOK_SECRET?.trim() || process.env.AURINKO_SIGNING_SECRET?.trim();
    if (!secret && process.env.NODE_ENV === 'production') {
        return c.json({ success: false, message: 'Webhook authentication is not configured' }, 503);
    }
    if (secret) {
        const received =
            c.req.header('x-aurinko-webhook-secret') ||
            c.req.header('x-webhook-secret') ||
            c.req.query('secret');

        if (received !== secret) {
            return c.json({ success: false, message: 'Forbidden' }, 403);
        }
    }

    const rawPayload = await c.req.json().catch(() => ({}));
    const payload = AurinkoWebhookSchema.parse(rawPayload);
    const result = await EmailService.syncWebhookAccount({
        accountId:
            payload.accountId?.toString() || c.req.header('x-aurinko-account-id') || undefined,
        subscriptionId:
            payload.subscriptionId?.toString() ||
            payload.subscription?.id?.toString() ||
            c.req.header('x-aurinko-subscription-id') ||
            undefined,
    });
    return success(c, result);
});

export default app;
