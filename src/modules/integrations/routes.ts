import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';
import { paginationMiddleware } from 'src/middleware/pagination';
import z from 'zod';

import {
    QuickBooksAutoDailySyncSchema,
    QuickBooksCreateVendorSchema,
    QuickBooksReferenceListQuerySchema,
    QuickBooksVendorMappingSchema,
} from './models';
import { QuickBooksReferenceSyncService } from './reference-sync-service';
import { QuickBooksService } from './service';

const app = new Hono();
const QuickBooksVendorMappingParamSchema = z.object({ vendorId: z.string().min(1) });

app.get('/quickbooks/status', requirePermission({ integration: ['read'] }), async (c) => {
    const status = await QuickBooksService.getStatus();
    return success(c, status);
});

app.post('/quickbooks/auth-url', requirePermission({ integration: ['manage'] }), async (c) => {
    const user = c.get('user')!;
    const authorization = await QuickBooksService.createAuthorizationUrl(user.id);

    return success(c, authorization);
});

app.post('/quickbooks/disconnect', requirePermission({ integration: ['manage'] }), async (c) => {
    const result = await QuickBooksService.disconnect();

    return success(c, result);
});

app.get(
    '/quickbooks/reference-sync/status',
    requirePermission({ integration: ['read'] }),
    async (c) => {
        const status = await QuickBooksReferenceSyncService.getStatus();
        return success(c, status);
    }
);

app.get(
    '/quickbooks/bank-accounts',
    requirePermission({ integration: ['read'] }),
    zValidator('query', QuickBooksReferenceListQuerySchema),
    async (c) => {
        const result = await QuickBooksReferenceSyncService.listBankAccounts(c.req.valid('query'));
        return success(c, result);
    }
);

app.get(
    '/quickbooks/categories',
    requirePermission({ integration: ['read'] }),
    zValidator('query', QuickBooksReferenceListQuerySchema),
    async (c) => {
        const result = await QuickBooksReferenceSyncService.listLineItemCategories(
            c.req.valid('query')
        );
        return success(c, result);
    }
);

app.get(
    '/quickbooks/vendors',
    requirePermission({ integration: ['read'] }),
    zValidator('query', QuickBooksReferenceListQuerySchema),
    async (c) => {
        const result = await QuickBooksReferenceSyncService.listPayees(c.req.valid('query'));
        return success(c, result);
    }
);

app.get(
    '/quickbooks/vendor-options',
    requirePermission({ integration: ['read'] }),
    paginationMiddleware({
        defaultSize: 25,
        maxSize: 100,
        defaultSortBy: 'displayName',
        defaultSortOrder: 'asc',
        allowedSortFields: ['displayName', 'companyName', 'createdAt'],
    }),
    async (c) => {
        const pagination = c.get('pagination');
        const result = await QuickBooksReferenceSyncService.listPayeesPage(pagination, {
            includeInactive: c.req.query('includeInactive') === 'true',
        });
        return success(c, result.data, 200, 'OK', result.count);
    }
);

app.post(
    '/quickbooks/vendors',
    requirePermission({ monthlyBills: ['mark-payment'] }),
    zValidator('json', QuickBooksCreateVendorSchema),
    async (c) => {
        const result = await QuickBooksService.createVendor(c.req.valid('json'), c.get('user')!.id);
        return success(c, result, 201);
    }
);

app.put(
    '/quickbooks/vendor-mappings',
    requirePermission({ monthlyBills: ['mark-payment'] }),
    zValidator('json', QuickBooksVendorMappingSchema),
    async (c) => {
        const result = await QuickBooksService.mapVendorToPayee(
            c.req.valid('json'),
            c.get('user')!.id
        );
        return success(c, result);
    }
);

app.delete(
    '/quickbooks/vendor-mappings/:vendorId',
    requirePermission({ monthlyBills: ['mark-payment'] }),
    zValidator('param', QuickBooksVendorMappingParamSchema),
    async (c) => {
        const result = await QuickBooksService.unmapVendorFromPayee(
            c.req.valid('param'),
            c.get('user')!.id
        );
        return success(c, result);
    }
);

app.patch('/quickbooks/reference-sync', requirePermission({ integration: ['sync'] }), async (c) => {
    const result = await QuickBooksReferenceSyncService.syncReferenceData({
        trigger: 'MANUAL',
        userId: c.get('user')!.id,
    });
    return success(c, result);
});

app.patch(
    '/quickbooks/reference-sync/auto-daily',
    requirePermission({ integration: ['manage'] }),
    zValidator('json', QuickBooksAutoDailySyncSchema),
    async (c) => {
        const { enabled } = c.req.valid('json');
        const result = await QuickBooksReferenceSyncService.setAutoDailySync(enabled);
        return success(c, result);
    }
);

export default app;
