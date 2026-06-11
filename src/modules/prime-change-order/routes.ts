import { assertProjectAccess } from '@lib/access';
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

app.get('/fieldwire/sync-status', requirePermission({ primeChangeOrder: ['read'] }), async (c) => {
    const status = await PrimeChangeOrderService.getFieldwireSyncOverview();
    return success(c, status);
});

app.patch('/fieldwire/sync', requirePermission({ primeChangeOrder: ['sync'] }), async (c) => {
    const result = await PrimeChangeOrderService.syncMappedActiveProjects({
        trigger: 'MANUAL',
        userId: c.get('user')!.id,
        recordGlobalRun: true,
    });
    return success(c, result);
});

app.get(
    '/project/:projectId/status-summary',
    requirePermission({ primeChangeOrder: ['read'] }),
    async (c) => {
        const projectId = c.req.param('projectId');
        await assertProjectAccess(c, projectId);
        const summary = await PrimeChangeOrderService.getStatusSummary(projectId);
        return success(c, summary);
    }
);

app.get(
    '/project/:projectId/financial-summary',
    requirePermission({ primeChangeOrder: ['read'] }),
    async (c) => {
        const projectId = c.req.param('projectId');
        await assertProjectAccess(c, projectId);
        const summary = await PrimeChangeOrderService.getFinancialSummary(projectId);
        return success(c, summary);
    }
);

app.get(
    '/project/:projectId/sync-status',
    requirePermission({ primeChangeOrder: ['read'] }),
    async (c) => {
        const projectId = c.req.param('projectId');
        await assertProjectAccess(c, projectId);
        const status = await PrimeChangeOrderService.getSyncStatus(projectId);
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
        await assertProjectAccess(c, c.req.param('projectId'));
        const { data, count } = await PrimeChangeOrderService.getByProject(
            c.req.param('projectId'),
            pagination
        );
        return success(c, data, 200, 'OK', count);
    }
);

export default app;
