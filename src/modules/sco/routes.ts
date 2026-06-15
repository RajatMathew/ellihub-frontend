import {
    assertActivityEntityAccess,
    assertFileAccess,
    assertProjectActionAccess,
    assertProjectEntityActionAccess,
    assertScoAttachmentActionAccess,
    getAccessContext,
} from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddScoAttachmentSchema,
    GenerateScoPdfSchema,
    RemoveScoAttachmentSchema,
    ScoCreateSchema,
    ScoUpdateSchema,
    SetScoApprovedSchema,
    SetScoRejectedSchema,
    SetScoVoidSchema,
} from './models';
import { ScoService } from './service';

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
    requirePermission({ subChangeOrder: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'createdAt', defaultSortOrder: 'desc' }),
    async (c) => {
        const pagination = c.get('pagination');
        const access = await getAccessContext(c);
        const { data, count } = await ScoService.getScos(pagination, access);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/by-po/:poId', requirePermission({ subChangeOrder: ['read'] }), async (c) => {
    const poId = c.req.param('poId');
    await assertActivityEntityAccess(c, 'purchaseOrder', poId);
    const scos = await ScoService.getScosByPo(poId);
    return success(c, scos);
});

app.get('/project/:projectId/stats', requirePermission({ subChangeOrder: ['read'] }), async (c) => {
    const projectId = c.req.param('projectId');
    const access = await getAccessContext(c);
    const stats = await ScoService.getStats(projectId, access);
    return success(c, stats);
});

app.post(
    '/:id/pdf',
    requirePermission({ subChangeOrder: ['read'] }),
    zValidator('json', GenerateScoPdfSchema),
    async (c) => {
        const id = c.req.param('id');
        await assertActivityEntityAccess(c, 'subChangeOrder', id);
        const pdf = await ScoService.generatePdf(id, getRequestedBy(c), c.req.valid('json'));
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
    requirePermission({ subChangeOrder: ['update'] }),
    zValidator('json', GenerateScoPdfSchema),
    async (c) => {
        const id = c.req.param('id');
        await assertProjectEntityActionAccess(c, 'subChangeOrder', 'update', 'subChangeOrder', id);
        const pdf = await ScoService.savePdf(
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

app.get('/:id', requirePermission({ subChangeOrder: ['read'] }), async (c) => {
    const id = c.req.param('id');
    await assertActivityEntityAccess(c, 'subChangeOrder', id);
    const sco = await ScoService.getSco(id);
    return success(c, sco);
});

app.post(
    '/',
    requirePermission({ subChangeOrder: ['create'] }),
    zValidator('json', ScoCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectActionAccess(c, 'subChangeOrder', 'create', data.projectId);
        await assertActivityEntityAccess(c, 'purchaseOrder', data.purchaseOrderId);
        const sco = await ScoService.createSco(data, c.get('user')!.id);
        return success(c, sco, 201);
    }
);

app.put(
    '/',
    requirePermission({ subChangeOrder: ['update'] }),
    zValidator('json', ScoUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'subChangeOrder',
            'update',
            'subChangeOrder',
            data.id
        );
        await assertProjectActionAccess(c, 'subChangeOrder', 'update', data.projectId);
        await assertActivityEntityAccess(c, 'purchaseOrder', data.purchaseOrderId);
        const sco = await ScoService.updateSco(data, c.get('user')!.id);
        return success(c, sco);
    }
);

app.patch(
    '/approve',
    requirePermission({ subChangeOrder: ['approve'] }),
    zValidator('json', SetScoApprovedSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'subChangeOrder',
            'approve',
            'subChangeOrder',
            data.id
        );
        const sco = await ScoService.setApproved(data, c.get('user')!.id);
        return success(c, sco);
    }
);

app.patch(
    '/reject',
    requirePermission({ subChangeOrder: ['reject'] }),
    zValidator('json', SetScoRejectedSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'subChangeOrder',
            'reject',
            'subChangeOrder',
            data.id
        );
        const sco = await ScoService.setRejected(data, c.get('user')!.id);
        return success(c, sco);
    }
);

app.patch(
    '/set-void',
    requirePermission({ subChangeOrder: ['void'] }),
    zValidator('json', SetScoVoidSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'subChangeOrder',
            'void',
            'subChangeOrder',
            data.id
        );
        const sco = await ScoService.setVoid(data, c.get('user')!.id);
        return success(c, sco);
    }
);

app.patch(
    '/attachment/add',
    requirePermission({ subChangeOrder: ['update'] }),
    zValidator('json', AddScoAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(
            c,
            'subChangeOrder',
            'update',
            'subChangeOrder',
            data.scoId
        );
        await assertFileAccess(c, data.documentId);
        const attachment = await ScoService.addAttachment(data, c.get('user')!.id);
        return success(c, attachment);
    }
);

app.patch(
    '/attachment/remove',
    requirePermission({ subChangeOrder: ['update'] }),
    zValidator('json', RemoveScoAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertScoAttachmentActionAccess(c, data.id, 'update');
        await ScoService.removeAttachment(data, c.get('user')!.id);
        return success(c, null);
    }
);

export default app;
