import { paginationMiddleware } from '@middleware';
import { InvoiceService } from '@modules/invoice/services';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    CancelSchema,
    IssueSchema,
    LineItemCreateSchema,
    LineItemUpdateSchema,
    PaymentCreateSchema,
    POCreateSchema,
    POUpdateSchema,
    RecordDeliverySchema,
} from './models';
import poStatusRoutes from './po-status.routes';
import { POService } from './services';

const app = new Hono();

// Mount lookup table sub-routes
app.route('/statuses', poStatusRoutes);

// --- PO CRUD ---

app.get(
    '/',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'issueDate',
        defaultSortOrder: 'desc',
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { projectId, status, tradeCategory, vendorId, startDate, endDate, overdue } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(projectId && { projectId }),
            ...(status && { status }),
            ...(tradeCategory && { tradeCategory }),
            ...(vendorId && { vendorId }),
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
            ...(overdue && { overdue }),
        };

        const { data, count } = await POService.listPOs(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.post(
    '/',
    requirePermission({ project: ['create'] }),
    zValidator('json', POCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const po = await POService.createPO(data, userId);
        return success(c, po, 201);
    }
);

// --- Summary routes (static paths before :id) ---

app.get('/summary/project/:projectId', requirePermission({ project: ['view-all'] }), async (c) => {
    const projectId = c.req.param('projectId');
    const summary = await POService.getProjectPOSummary(projectId);
    return success(c, summary);
});

app.get(
    '/vendor/:vendorId',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'issueDate',
        defaultSortOrder: 'desc',
    }),
    async (c: Context) => {
        const vendorId = c.req.param('vendorId');
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { status, projectId } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(status && { status }),
            ...(projectId && { projectId }),
        };

        const result = await POService.getVendorPOHistory(vendorId, pagination);
        return success(c, result.data, 200, 'OK', result.count);
    }
);

// --- Workflow routes (static paths before :id) ---

app.post(
    '/:id/issue',
    requirePermission({ project: ['update'] }),
    zValidator('json', IssueSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const result = await POService.issuePO(id, data, userId);
        return success(c, result);
    }
);

app.post(
    '/:id/cancel',
    requirePermission({ project: ['delete'] }),
    zValidator('json', CancelSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const po = await POService.cancelPO(id, data, userId);
        return success(c, po);
    }
);

app.post(
    '/:id/record-delivery',
    requirePermission({ project: ['update'] }),
    zValidator('json', RecordDeliverySchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const po = await POService.recordDelivery(id, data);
        return success(c, po);
    }
);

// --- Line Items ---

app.post(
    '/:id/line-items',
    requirePermission({ project: ['update'] }),
    zValidator('json', LineItemCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const lineItem = await POService.addLineItem(id, data);
        return success(c, lineItem, 201);
    }
);

app.put(
    '/:id/line-items/:lineItemId',
    requirePermission({ project: ['update'] }),
    zValidator('json', LineItemUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const lineItemId = c.req.param('lineItemId');
        const data = c.req.valid('json');
        const lineItem = await POService.updateLineItem(id, lineItemId, data);
        return success(c, lineItem);
    }
);

app.delete('/:id/line-items/:lineItemId', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const lineItemId = c.req.param('lineItemId');
    await POService.removeLineItem(id, lineItemId);
    return success(c, null, 200, 'Line item removed');
});

// --- Payments ---

app.post(
    '/:id/payments',
    requirePermission({ project: ['update'] }),
    zValidator('json', PaymentCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const result = await POService.createPayment(id, data, userId);
        return success(c, result, 201);
    }
);

app.get('/:id/payments', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const result = await POService.listPayments(id);
    return success(c, result);
});

app.delete('/:id/payments/:paymentId', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    const paymentId = c.req.param('paymentId');
    await POService.deletePayment(id, paymentId);
    return success(c, null, 200, 'Payment deleted');
});

// --- Invoices sub-resource ---

app.get('/:id/invoices', requirePermission({ project: ['view-all'] }), async (c) => {
    const poId = c.req.param('id');
    const result = await InvoiceService.listPOInvoices(poId);
    return success(c, result);
});

// --- PO Detail (must be after all static sub-routes) ---

app.get('/:id', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const po = await POService.getPO(id);
    return success(c, po);
});

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', POUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const po = await POService.updatePO(id, data);
        return success(c, po);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await POService.deletePO(id);
    return success(c, null, 200, 'Purchase order deleted');
});

export default app;
