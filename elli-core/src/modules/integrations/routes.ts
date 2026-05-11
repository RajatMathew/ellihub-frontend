import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { QuickBooksCallbackQuerySchema, QuickBooksTransactionsQuerySchema } from './models';
import { QuickBooksService } from './service';

const app = new Hono();

app.get('/quickbooks/status', requirePermission({ integration: ['read'] }), async (c) => {
    const status = await QuickBooksService.getStatus();
    return success(c, status);
});

app.post('/quickbooks/auth-url', requirePermission({ integration: ['manage'] }), async (c) => {
    const user = c.get('user')!;
    const authorization = await QuickBooksService.createAuthorizationUrl(user.id);

    return success(c, authorization);
});

app.get('/quickbooks/callback', zValidator('query', QuickBooksCallbackQuerySchema), async (c) => {
    const user = c.get('user')!;
    const result = await QuickBooksService.handleCallback(c.req.valid('query'), user.id);

    return c.redirect(result.redirectUrl);
});

app.get(
    '/quickbooks/transactions',
    requirePermission({ integration: ['read'] }),
    zValidator('query', QuickBooksTransactionsQuerySchema),
    async (c) => {
        const transactions = await QuickBooksService.getTransactions(c.req.valid('query'));
        return success(c, transactions);
    }
);

app.post('/quickbooks/disconnect', requirePermission({ integration: ['manage'] }), async (c) => {
    const result = await QuickBooksService.disconnect();

    return success(c, result);
});

export default app;
