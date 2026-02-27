import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import invoiceStatusRoutes from './invoice-status.routes';
import {
    DisputeSchema,
    InvoiceCreateSchema,
    InvoiceLineItemCreateSchema,
    InvoiceLineItemUpdateSchema,
    InvoiceRejectSchema,
    InvoiceUpdateSchema,
    MarkPaidSchema,
    ResolveDisputeSchema,
} from './models';
import { InvoiceService } from './services';

const app = new Hono();

// Mount lookup table sub-routes
app.route('/statuses', invoiceStatusRoutes);

// --- List Invoices ---

app.get(
    '/',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'invoiceDate',
        defaultSortOrder: 'desc',
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const {
            projectId,
            status,
            vendorId,
            poId,
            invoiceType,
            category,
            startDate,
            endDate,
            isPaid,
            isDisputed,
            isOverdue,
        } = query;

        pagination.filter = {
            ...pagination.filter,
            ...(projectId && { projectId }),
            ...(status && { status }),
            ...(vendorId && { vendorId }),
            ...(poId && { poId }),
            ...(invoiceType && { invoiceType }),
            ...(category && { category }),
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
            ...(isPaid && { isPaid }),
            ...(isDisputed && { isDisputed }),
            ...(isOverdue && { isOverdue }),
        };

        const { data, count } = await InvoiceService.listInvoices(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

// --- Create Invoice ---

app.post(
    '/',
    requirePermission({ project: ['create'] }),
    zValidator('json', InvoiceCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const invoice = await InvoiceService.createInvoice(data, userId);
        return success(c, invoice, 201);
    }
);

// --- Static routes (before :id) ---

app.get(
    '/approval-queue',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'dueDate',
        defaultSortOrder: 'asc',
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const { data, count } = await InvoiceService.listApprovalQueue(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

// --- Workflow ---

app.post('/:id/approve', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const userId = c.get('user')!.id;
    const invoice = await InvoiceService.approveInvoice(id, userId);
    return success(c, invoice);
});

app.post(
    '/:id/reject',
    requirePermission({ project: ['update'] }),
    zValidator('json', InvoiceRejectSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const invoice = await InvoiceService.rejectInvoice(id, data, userId);
        return success(c, invoice);
    }
);

app.post(
    '/:id/mark-paid',
    requirePermission({ project: ['update'] }),
    zValidator('json', MarkPaidSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const result = await InvoiceService.markPaid(id, data, userId);
        return success(c, result);
    }
);

// --- Dispute ---

app.post(
    '/:id/dispute',
    requirePermission({ project: ['update'] }),
    zValidator('json', DisputeSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const invoice = await InvoiceService.disputeInvoice(id, data);
        return success(c, invoice);
    }
);

app.post(
    '/:id/resolve-dispute',
    requirePermission({ project: ['update'] }),
    zValidator('json', ResolveDisputeSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const invoice = await InvoiceService.resolveDispute(id, data);
        return success(c, invoice);
    }
);

// --- Line Items ---

app.post(
    '/:id/line-items',
    requirePermission({ project: ['update'] }),
    zValidator('json', InvoiceLineItemCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const result = await InvoiceService.addLineItem(id, data);
        return success(c, result, 201);
    }
);

app.put(
    '/:id/line-items/:lineItemId',
    requirePermission({ project: ['update'] }),
    zValidator('json', InvoiceLineItemUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const lineItemId = c.req.param('lineItemId');
        const data = c.req.valid('json');
        const result = await InvoiceService.updateLineItem(id, lineItemId, data);
        return success(c, result);
    }
);

app.delete('/:id/line-items/:lineItemId', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const lineItemId = c.req.param('lineItemId');
    await InvoiceService.removeLineItem(id, lineItemId);
    return success(c, null, 200, 'Line item removed');
});

// --- Invoice Detail (must be after all static sub-routes) ---

app.get('/:id', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const invoice = await InvoiceService.getInvoice(id);
    return success(c, invoice);
});

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', InvoiceUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const invoice = await InvoiceService.updateInvoice(id, data);
        return success(c, invoice);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await InvoiceService.deleteInvoice(id);
    return success(c, null, 200, 'Invoice deleted');
});

export default app;
