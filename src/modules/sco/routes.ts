import { paginationMiddleware } from '@middleware';
import { BadRequestError, success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    RejectSchema,
    SCOCreateSchema,
    SCOLineItemCreateSchema,
    SCOLineItemUpdateSchema,
    SCOUpdateSchema,
    VoidSchema,
} from './models';
import { SCOService } from './services';

const app = new Hono();

// --- SCO Create (with purchaseOrderId in body) ---

app.post(
    '/',
    requirePermission({ project: ['create'] }),
    zValidator('json', SCOCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const sco = await SCOService.createSCO(data, userId);
        return success(c, sco, 201);
    }
);

// --- List SCOs ---

app.get(
    '/',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'date',
        defaultSortOrder: 'desc',
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { projectId, poId, status, vendorId, initiatedBy, changeType, startDate, endDate } =
            query;

        // If projectId provided, list by project; if poId provided, list by PO
        if (projectId) {
            pagination.filter = {
                ...pagination.filter,
                ...(status && { status }),
                ...(poId && { poId }),
                ...(vendorId && { vendorId }),
                ...(initiatedBy && { initiatedBy }),
                ...(changeType && { changeType }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
            };
            const { data, count } = await SCOService.listSCOsByProject(projectId, pagination);
            return success(c, data, 200, 'OK', count);
        }

        if (poId) {
            pagination.filter = {
                ...pagination.filter,
                ...(status && { status }),
            };
            const { data, count } = await SCOService.listSCOsByPO(poId, pagination);
            return success(c, data, 200, 'OK', count);
        }

        throw new BadRequestError('Either projectId or poId query parameter is required');
    }
);

// --- Static routes (before :id) ---

app.get(
    '/pending',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'date',
        defaultSortOrder: 'asc',
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const result = await SCOService.listPendingSCOs(pagination);
        return success(c, result.data, 200, 'OK', result.count);
    }
);

app.get('/summary/project/:projectId', requirePermission({ project: ['view-all'] }), async (c) => {
    const projectId = c.req.param('projectId');
    const summary = await SCOService.getProjectSCOSummary(projectId);
    return success(c, summary);
});

// --- Workflow routes ---

app.post('/:id/approve', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const userId = c.get('user')!.id;
    const result = await SCOService.approveSCO(id, userId);
    return success(c, result);
});

app.post(
    '/:id/reject',
    requirePermission({ project: ['update'] }),
    zValidator('json', RejectSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const sco = await SCOService.rejectSCO(id, data, userId);
        return success(c, sco);
    }
);

app.post(
    '/:id/void',
    requirePermission({ project: ['delete'] }),
    zValidator('json', VoidSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const sco = await SCOService.voidSCO(id, data, userId);
        return success(c, sco);
    }
);

// --- Line Items ---

app.post(
    '/:id/line-items',
    requirePermission({ project: ['update'] }),
    zValidator('json', SCOLineItemCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const result = await SCOService.addLineItem(id, data);
        return success(c, result, 201);
    }
);

app.put(
    '/:id/line-items/:lineItemId',
    requirePermission({ project: ['update'] }),
    zValidator('json', SCOLineItemUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const lineItemId = c.req.param('lineItemId');
        const data = c.req.valid('json');
        const result = await SCOService.updateLineItem(id, lineItemId, data);
        return success(c, result);
    }
);

app.delete('/:id/line-items/:lineItemId', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const lineItemId = c.req.param('lineItemId');
    await SCOService.removeLineItem(id, lineItemId);
    return success(c, null, 200, 'Line item removed');
});

// --- Margin Comparison ---

app.get('/:id/margin-comparison', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const result = await SCOService.getMarginComparison(id);
    return success(c, result);
});

// --- SCO Detail (must be after all static sub-routes) ---

app.get('/:id', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const sco = await SCOService.getSCO(id);
    return success(c, sco);
});

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', SCOUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const sco = await SCOService.updateSCO(id, data);
        return success(c, sco);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await SCOService.deleteSCO(id);
    return success(c, null, 200, 'Change order deleted');
});

export default app;
