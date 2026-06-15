import {
    assertActivityEntityAccess,
    assertFileAccess,
    assertPoAttachmentActionAccess,
    assertProjectActionAccess,
    assertProjectActionForActivityEntity,
    assertProjectEntityActionAccess,
    getAccessContext,
} from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddPoAttachmentSchema,
    GeneratePoPdfSchema,
    PoCreateSchema,
    PoFromRfqSchema,
    PoUpdateSchema,
    RemovePoAttachmentSchema,
    SetPoCancelledSchema,
    SetPoDeliveredSchema,
    SetPoIssuedSchema,
} from './models';
import { PoService } from './service';

const app = new Hono();

function getContentDisposition(disposition: 'inline' | 'attachment', fileName: string): string {
    const fallbackName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    return `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function getResponseBody(content: Uint8Array): ArrayBuffer {
    const body = new Uint8Array(content.byteLength);
    body.set(content);
    return body.buffer;
}

function getRequestedBy(c: Context): string {
    const user = c.get('user');
    return user?.name || user?.email || 'Elli NY Design Corp';
}

app.get(
    '/',
    requirePermission({ purchaseOrder: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'createdAt', defaultSortOrder: 'desc' }),
    async (c) => {
        const pagination = c.get('pagination');
        const access = await getAccessContext(c);
        const { data, count } = await PoService.getPurchaseOrders(pagination, access);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/pdf/default-terms', requirePermission({ purchaseOrder: ['read'] }), async (c) => {
    const terms = await PoService.getDefaultPdfTerms();
    return success(c, terms);
});

app.get('/pdf/terms', requirePermission({ purchaseOrder: ['read'] }), async (c) => {
    const terms = await PoService.getPdfTermsOptions();
    return success(c, terms);
});

app.get('/project/:projectId/stats', requirePermission({ purchaseOrder: ['read'] }), async (c) => {
    const projectId = c.req.param('projectId');
    const access = await getAccessContext(c);
    const stats = await PoService.getStats(projectId, access);
    return success(c, stats);
});

app.post(
    '/:id/pdf',
    requirePermission({ purchaseOrder: ['read'] }),
    zValidator('json', GeneratePoPdfSchema),
    async (c) => {
        const id = c.req.param('id');
        await assertActivityEntityAccess(c, 'purchaseOrder', id);
        const pdf = await PoService.generatePdf(id, getRequestedBy(c), c.req.valid('json'));
        const headers = new Headers({
            'Content-Type': pdf.contentType,
            'Content-Length': String(pdf.bytes.byteLength),
            'Content-Disposition': getContentDisposition('attachment', pdf.fileName),
            'Cache-Control': 'private, max-age=0, no-store',
            'X-PDF-Engine-Cache-Hit': String(pdf.cacheHit),
        });

        if (pdf.requestHash) {
            headers.set('X-PDF-Engine-Request-Hash', pdf.requestHash);
        }

        return new Response(getResponseBody(pdf.bytes), {
            status: 200,
            headers,
        });
    }
);

app.post(
    '/:id/pdf/save',
    requirePermission({ purchaseOrder: ['update'] }),
    zValidator('json', GeneratePoPdfSchema),
    async (c) => {
        const id = c.req.param('id');
        await assertProjectEntityActionAccess(c, 'purchaseOrder', 'update', 'purchaseOrder', id);
        const pdf = await PoService.savePdf(
            id,
            getRequestedBy(c),
            c.get('user')!.id,
            c.req.valid('json')
        );
        const headers = new Headers({
            'Content-Type': pdf.contentType,
            'Content-Length': String(pdf.bytes.byteLength),
            'Content-Disposition': getContentDisposition('attachment', pdf.fileName),
            'Cache-Control': 'private, max-age=0, no-store',
            'X-PDF-Engine-Cache-Hit': String(pdf.cacheHit),
            'X-Saved-File-Id': pdf.savedFileId,
        });

        if (pdf.requestHash) {
            headers.set('X-PDF-Engine-Request-Hash', pdf.requestHash);
        }
        if (pdf.savedAttachmentId) {
            headers.set('X-Saved-Attachment-Id', pdf.savedAttachmentId);
        }

        return new Response(getResponseBody(pdf.bytes), {
            status: 200,
            headers,
        });
    }
);

app.get('/:id', requirePermission({ purchaseOrder: ['read'] }), async (c) => {
    const id = c.req.param('id');
    await assertActivityEntityAccess(c, 'purchaseOrder', id);
    const po = await PoService.getPurchaseOrder(id);
    return success(c, po);
});

app.post(
    '/',
    requirePermission({ purchaseOrder: ['create'] }),
    zValidator('json', PoCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectActionAccess(c, 'purchaseOrder', 'create', data.projectId);
        if (data.rfqId) await assertActivityEntityAccess(c, 'rfq', data.rfqId);
        const po = await PoService.createPurchaseOrder(data, c.get('user')!.id);
        return success(c, po, 201);
    }
);

app.put(
    '/',
    requirePermission({ purchaseOrder: ['update'] }),
    zValidator('json', PoUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'purchaseOrder',
            'update',
            'purchaseOrder',
            data.id
        );
        await assertProjectActionAccess(c, 'purchaseOrder', 'update', data.projectId);
        if (data.rfqId) await assertActivityEntityAccess(c, 'rfq', data.rfqId);
        const po = await PoService.updatePurchaseOrder(data, c.get('user')!.id);
        return success(c, po);
    }
);

app.post(
    '/from-rfq/:rfqId',
    requirePermission({ purchaseOrder: ['create'] }),
    zValidator('json', PoFromRfqSchema),
    async (c) => {
        const rfqId = c.req.param('rfqId');
        const data = c.req.valid('json');
        await assertProjectActionForActivityEntity(c, 'purchaseOrder', 'create', 'rfq', rfqId);
        const po = await PoService.createFromRfq(rfqId, data, c.get('user')!.id);
        return success(c, po, 201);
    }
);

app.patch(
    '/set-issued',
    requirePermission({ purchaseOrder: ['issue'] }),
    zValidator('json', SetPoIssuedSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'purchaseOrder',
            'issue',
            'purchaseOrder',
            data.id
        );
        const po = await PoService.setIssued(data, c.get('user')!.id);
        return success(c, po);
    }
);

app.patch(
    '/set-delivered',
    requirePermission({ purchaseOrder: ['deliver'] }),
    zValidator('json', SetPoDeliveredSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'purchaseOrder',
            'deliver',
            'purchaseOrder',
            data.id
        );
        const po = await PoService.setDelivered(data, c.get('user')!.id);
        return success(c, po);
    }
);

app.patch(
    '/set-cancelled',
    requirePermission({ purchaseOrder: ['cancel'] }),
    zValidator('json', SetPoCancelledSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'purchaseOrder',
            'cancel',
            'purchaseOrder',
            data.id
        );
        const po = await PoService.setCancelled(data, c.get('user')!.id);
        return success(c, po);
    }
);

app.patch(
    '/attachment/add',
    requirePermission({ purchaseOrder: ['update'] }),
    zValidator('json', AddPoAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'purchaseOrder',
            'update',
            'purchaseOrder',
            data.purchaseOrderId
        );
        await assertFileAccess(c, data.documentId);
        const attachment = await PoService.addAttachment(data, c.get('user')!.id);
        return success(c, attachment);
    }
);

app.patch(
    '/attachment/remove',
    requirePermission({ purchaseOrder: ['update'] }),
    zValidator('json', RemovePoAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertPoAttachmentActionAccess(c, data.id, 'update');
        await PoService.removeAttachment(data, c.get('user')!.id);
        return success(c, null);
    }
);

export default app;
