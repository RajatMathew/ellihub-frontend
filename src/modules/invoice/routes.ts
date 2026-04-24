import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddInvoiceAttachmentSchema,
    DisputeInvoiceSchema,
    InvoiceCreateSchema,
    InvoiceUpdateSchema,
    MarkInvoicePaidSchema,
    MarkInvoiceUnpaidSchema,
    RemoveInvoiceAttachmentSchema,
    ResolveInvoiceDisputeSchema,
} from './models';
import { InvoiceService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ invoice: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'createdAt', defaultSortOrder: 'desc' }),
    async (c) => {
        const pagination = c.get('pagination');
        const { data, count } = await InvoiceService.getInvoices(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', requirePermission({ invoice: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const invoice = await InvoiceService.getInvoice(id);
    return success(c, invoice);
});

app.post(
    '/',
    requirePermission({ invoice: ['create'] }),
    zValidator('json', InvoiceCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const invoice = await InvoiceService.createInvoice(data, c.get('user')!.id);
        return success(c, invoice, 201);
    }
);

app.put(
    '/',
    requirePermission({ invoice: ['update'] }),
    zValidator('json', InvoiceUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const invoice = await InvoiceService.updateInvoice(data, c.get('user')!.id);
        return success(c, invoice);
    }
);

app.patch(
    '/mark-paid',
    requirePermission({ invoice: ['update'] }),
    zValidator('json', MarkInvoicePaidSchema),
    async (c) => {
        const data = c.req.valid('json');
        const invoice = await InvoiceService.markPaid(data, c.get('user')!.id);
        return success(c, invoice);
    }
);

app.patch(
    '/mark-unpaid',
    requirePermission({ invoice: ['update'] }),
    zValidator('json', MarkInvoiceUnpaidSchema),
    async (c) => {
        const data = c.req.valid('json');
        const invoice = await InvoiceService.markUnpaid(data, c.get('user')!.id);
        return success(c, invoice);
    }
);

app.patch(
    '/dispute',
    requirePermission({ invoice: ['update'] }),
    zValidator('json', DisputeInvoiceSchema),
    async (c) => {
        const data = c.req.valid('json');
        const invoice = await InvoiceService.disputeInvoice(data, c.get('user')!.id);
        return success(c, invoice);
    }
);

app.patch(
    '/resolve-dispute',
    requirePermission({ invoice: ['update'] }),
    zValidator('json', ResolveInvoiceDisputeSchema),
    async (c) => {
        const data = c.req.valid('json');
        const invoice = await InvoiceService.resolveDispute(data, c.get('user')!.id);
        return success(c, invoice);
    }
);

app.patch(
    '/attachment/add',
    requirePermission({ invoice: ['update'] }),
    zValidator('json', AddInvoiceAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        const attachment = await InvoiceService.addAttachment(data, c.get('user')!.id);
        return success(c, attachment);
    }
);

app.patch(
    '/attachment/remove',
    requirePermission({ invoice: ['update'] }),
    zValidator('json', RemoveInvoiceAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await InvoiceService.removeAttachment(data, c.get('user')!.id);
        return success(c, null);
    }
);

export default app;
