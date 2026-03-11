import { paginationMiddleware } from '@middleware';
import { BadRequestError, success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import changeOrderStatusRoutes from './change-order-status.routes';
import {
    PCOCreateSchema,
    PCOLineItemCreateSchema,
    PCOLineItemUpdateSchema,
    PCORejectSchema,
    PCOStatusTransitionSchema,
    PCOUpdateSchema,
    PCOVoidSchema,
} from './models';
import pcoChangeTypeRoutes from './pco-change-type.routes';
import { PCOService } from './services';

const app = new Hono();

// Mount lookup table sub-routes
app.route('/statuses', changeOrderStatusRoutes);
app.route('/change-types', pcoChangeTypeRoutes);

// --- List PCOs ---

app.get(
    '/',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'date', defaultSortOrder: 'desc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { projectId, status, changeTypeId, priority, dateFrom, dateTo } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(projectId && { projectId }),
            ...(status && { status }),
            ...(changeTypeId && { changeTypeId }),
            ...(priority && { priority }),
            ...(dateFrom && { dateFrom }),
            ...(dateTo && { dateTo }),
        };

        const { data, count } = await PCOService.listPCOs(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

// --- Create PCO ---

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const pco = await PCOService.createPCO(data, userId);
        return success(c, pco, 201);
    }
);

// --- Static routes (before :id) ---

app.get('/pipeline', requirePermission({ project: ['view-all'] }), async (c) => {
    const projectId = c.req.query('projectId');
    if (!projectId) {
        throw new BadRequestError('projectId query parameter is required');
    }
    const pipeline = await PCOService.getPipeline(projectId);
    return success(c, { pipeline });
});

// --- Workflow endpoints ---

app.post('/:id/approve', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const userId = c.get('user')!.id;
    const result = await PCOService.approvePCO(id, userId);
    return success(c, result);
});

app.post(
    '/:id/reject',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCORejectSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const pco = await PCOService.rejectPCO(id, data, userId);
        return success(c, pco);
    }
);

app.post(
    '/:id/void',
    requirePermission({ project: ['delete'] }),
    zValidator('json', PCOVoidSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const pco = await PCOService.voidPCO(id, data, userId);
        return success(c, pco);
    }
);

// --- Generic status transition (existing) ---

app.put(
    '/:id/status',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOStatusTransitionSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const pco = await PCOService.transitionStatus(id, data, userId);
        return success(c, pco);
    }
);

// --- Line Items ---

app.post(
    '/:id/line-items',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOLineItemCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const result = await PCOService.addLineItem(id, data);
        return success(c, result, 201);
    }
);

app.put(
    '/:id/line-items/:lineItemId',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOLineItemUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const lineItemId = c.req.param('lineItemId');
        const data = c.req.valid('json');
        const result = await PCOService.updateLineItem(id, lineItemId, data);
        return success(c, result);
    }
);

app.delete('/:id/line-items/:lineItemId', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const lineItemId = c.req.param('lineItemId');
    await PCOService.removeLineItem(id, lineItemId);
    return success(c, null, 200, 'Line item removed');
});

// --- Financial Impact ---

app.get('/:id/financial-impact', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const result = await PCOService.getFinancialImpact(id);
    return success(c, result);
});

// --- PCO Detail (must be after all static sub-routes) ---

app.get('/:id', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const pco = await PCOService.getPCO(id);
    return success(c, pco);
});

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const pco = await PCOService.updatePCO(id, data);
        return success(c, pco);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await PCOService.deletePCO(id);
    return success(c, null, 200, 'Prime Change Order deleted');
});

export default app;
