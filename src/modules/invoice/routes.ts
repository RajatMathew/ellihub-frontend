import {
    assertActivityEntityAccess,
    assertFileAccess,
    assertInvoiceAttachmentActionAccess,
    assertProjectActionAccess,
    assertProjectEntityActionAccess,
    getAccessContext,
} from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
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
        const access = await getAccessContext(c);
        const { data, count } = await InvoiceService.getInvoices(pagination, access);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/by-po/:poId', requirePermission({ invoice: ['read'] }), async (c) => {
    const poId = c.req.param('poId');
    await assertActivityEntityAccess(c, 'purchaseOrder', poId);
    const invoices = await InvoiceService.getInvoicesByPo(poId);
    return success(c, invoices);
});

app.get('/project/:projectId/stats', requirePermission({ invoice: ['read'] }), async (c) => {
    const projectId = c.req.param('projectId');
    const access = await getAccessContext(c);
    const stats = await InvoiceService.getStats(projectId, access);
    return success(c, stats);
});

app.get('/:id', requirePermission({ invoice: ['read'] }), async (c) => {
    const id = c.req.param('id');
    await assertActivityEntityAccess(c, 'invoice', id);
    const invoice = await InvoiceService.getInvoice(id);
    return success(c, invoice);
});

app.post(
    '/',
    requirePermission({ invoice: ['create'] }),
    zValidator('json', InvoiceCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectActionAccess(c, 'invoice', 'create', data.projectId);
        if (data.purchaseOrderId) {
            await assertActivityEntityAccess(c, 'purchaseOrder', data.purchaseOrderId);
        }
        await Promise.all([
            ...data.relatedSCOIds.map((id) => assertActivityEntityAccess(c, 'subChangeOrder', id)),
            ...data.attachments.map((fileId) => assertFileAccess(c, fileId)),
        ]);
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
        await assertProjectEntityActionAccess(c, 'invoice', 'update', 'invoice', data.id);
        await assertProjectActionAccess(c, 'invoice', 'update', data.projectId);
        if (data.purchaseOrderId) {
            await assertActivityEntityAccess(c, 'purchaseOrder', data.purchaseOrderId);
        }
        await Promise.all(
            data.relatedSCOIds.map((id) => assertActivityEntityAccess(c, 'subChangeOrder', id))
        );
        const invoice = await InvoiceService.updateInvoice(data, c.get('user')!.id);
        return success(c, invoice);
    }
);

app.patch(
    '/mark-paid',
    requirePermission({ invoice: ['mark-paid'] }),
    zValidator('json', MarkInvoicePaidSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(c, 'invoice', 'mark-paid', 'invoice', data.id);
        const invoice = await InvoiceService.markPaid(data, c.get('user')!.id);
        return success(c, invoice);
    }
);

app.patch(
    '/mark-unpaid',
    requirePermission({ invoice: ['mark-unpaid'] }),
    zValidator('json', MarkInvoiceUnpaidSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(c, 'invoice', 'mark-unpaid', 'invoice', data.id);
        const invoice = await InvoiceService.markUnpaid(data, c.get('user')!.id);
        return success(c, invoice);
    }
);

app.patch(
    '/dispute',
    requirePermission({ invoice: ['dispute'] }),
    zValidator('json', DisputeInvoiceSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(c, 'invoice', 'dispute', 'invoice', data.id);
        const invoice = await InvoiceService.disputeInvoice(data, c.get('user')!.id);
        return success(c, invoice);
    }
);

app.patch(
    '/resolve-dispute',
    requirePermission({ invoice: ['resolve-dispute'] }),
    zValidator('json', ResolveInvoiceDisputeSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(c, 'invoice', 'resolve-dispute', 'invoice', data.id);
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
        await assertProjectEntityActionAccess(c, 'invoice', 'update', 'invoice', data.invoiceId);
        await assertFileAccess(c, data.documentId);
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
        await assertInvoiceAttachmentActionAccess(c, data.id, 'update');
        await InvoiceService.removeAttachment(data, c.get('user')!.id);
        return success(c, null);
    }
);

export default app;
