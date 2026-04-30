import { paginationMiddleware } from '@middleware';
import { success } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { PrimeChangeOrderService } from './service';

const app = new Hono();

const primeChangeOrderSortFields = [
    'referenceNumber',
    'name',
    'statusName',
    'dueDate',
    'totalCost',
    'fieldwireCreatedAt',
    'fieldwireUpdatedAt',
    'lastSyncedAt',
];

app.get(
    '/project/:projectId/status-summary',
    requirePermission({ primeChangeOrder: ['read'] }),
    async (c) => {
        const summary = await PrimeChangeOrderService.getStatusSummary(c.req.param('projectId'));
        return success(c, summary);
    }
);

app.get(
    '/project/:projectId/financial-summary',
    requirePermission({ primeChangeOrder: ['read'] }),
    async (c) => {
        const summary = await PrimeChangeOrderService.getFinancialSummary(c.req.param('projectId'));
        return success(c, summary);
    }
);

app.get(
    '/project/:projectId/sync-status',
    requirePermission({ primeChangeOrder: ['read'] }),
    async (c) => {
        const status = await PrimeChangeOrderService.getSyncStatus(c.req.param('projectId'));
        return success(c, status);
    }
);

app.patch(
    '/project/:projectId/sync',
    requirePermission({ primeChangeOrder: ['sync'] }),
    async (c) => {
        const result = await PrimeChangeOrderService.syncProject(
            c.req.param('projectId'),
            'MANUAL',
            c.get('user')!.id
        );
        return success(c, result);
    }
);

app.get(
    '/project/:projectId',
    requirePermission({ primeChangeOrder: ['read'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'fieldwireUpdatedAt',
        defaultSortOrder: 'desc',
        allowedSortFields: primeChangeOrderSortFields,
    }),
    async (c) => {
        const pagination = c.get('pagination');
        const { data, count } = await PrimeChangeOrderService.getByProject(
            c.req.param('projectId'),
            pagination
        );
        return success(c, data, 200, 'OK', count);
    }
);

export default app;
