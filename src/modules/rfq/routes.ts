import {
    assertActivityEntityAccess,
    assertFileAccess,
    assertProjectActionAccess,
    assertProjectEntityActionAccess,
    assertRfqAttachmentActionAccess,
    assertRfqVendorQuoteAccess,
    assertRfqVendorQuoteActionAccess,
    getAccessContext,
} from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddRfqAttachmentSchema,
    AddVendorSchema,
    AwardRfqSchema,
    DeclineQuoteSchema,
    EditQuoteSchema,
    GenerateVendorPdfSchema,
    RemoveQuoteSchema,
    RemoveRfqAttachmentSchema,
    RemoveVendorSchema,
    RfqCreateSchema,
    RfqUpdateSchema,
    SubmitQuoteSchema,
    UnawardRfqSchema,
    VoidAwardSchema,
    VoidRfqSchema,
} from './models';
import { RfqService } from './service';

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
    requirePermission({ rfq: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'createdAt', defaultSortOrder: 'desc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const access = await getAccessContext(c);
        const { data, count } = await RfqService.getRfqs(pagination, access);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id/bid-comparison', requirePermission({ rfq: ['read'] }), async (c) => {
    const id = c.req.param('id');
    await assertActivityEntityAccess(c, 'rfq', id);
    const comparison = await RfqService.getBidComparison(id);
    return success(c, comparison);
});

app.get('/:id', requirePermission({ rfq: ['read'] }), async (c) => {
    const id = c.req.param('id');
    await assertActivityEntityAccess(c, 'rfq', id);
    const rfq = await RfqService.getRfq(id);
    return success(c, rfq);
});

app.post(
    '/',
    requirePermission({ rfq: ['create'] }),
    zValidator('json', RfqCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectActionAccess(c, 'rfq', 'create', data.projectId);
        const rfq = await RfqService.createRfq(data, c.get('user')!.id);
        return success(c, rfq, 201);
    }
);

app.put(
    '/',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', RfqUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(c, 'rfq', 'update', 'rfq', data.id);
        const rfq = await RfqService.updateRfq(data, c.get('user')!.id);
        return success(c, rfq);
    }
);

app.delete('/:id', requirePermission({ rfq: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await assertProjectEntityActionAccess(c, 'rfq', 'delete', 'rfq', id);
    await RfqService.deleteRfq(id, c.get('user')!.id);
    return success(c, null);
});

app.patch(
    '/vendor/add',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', AddVendorSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(c, 'rfq', 'update', 'rfq', data.rfqId);
        const quote = await RfqService.addVendor(data, c.get('user')!.id);
        return success(c, quote);
    }
);

app.patch(
    '/vendor/submit-quote',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', SubmitQuoteSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertRfqVendorQuoteActionAccess(c, data.id, 'update');
        await Promise.all(data.attachments.map((fileId) => assertFileAccess(c, fileId)));
        const quote = await RfqService.submitQuote(data, c.get('user')!.id);
        return success(c, quote);
    }
);

app.post(
    '/vendor/:id/pdf',
    requirePermission({ rfq: ['read'] }),
    zValidator('json', GenerateVendorPdfSchema),
    async (c) => {
        const request = c.req.valid('json');
        await assertRfqVendorQuoteAccess(c, c.req.param('id'));
        const pdf = await RfqService.generateVendorPdf(
            c.req.param('id'),
            getRequestedBy(c),
            null,
            request
        );
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
    '/vendor/:id/pdf/save',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', GenerateVendorPdfSchema),
    async (c) => {
        const request = c.req.valid('json');
        const quoteId = c.req.param('id');
        await assertRfqVendorQuoteActionAccess(c, quoteId, 'update');
        const pdf = await RfqService.saveVendorPdf(
            quoteId,
            getRequestedBy(c),
            c.get('user')!.id,
            request
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

app.patch(
    '/vendor/decline-quote',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', DeclineQuoteSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertRfqVendorQuoteActionAccess(c, data.id, 'update');
        const quote = await RfqService.declineQuote(data, c.get('user')!.id);
        return success(c, quote);
    }
);

app.patch(
    '/vendor/remove-quote',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', RemoveQuoteSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertRfqVendorQuoteActionAccess(c, data.id, 'update');
        const quote = await RfqService.removeQuote(data, c.get('user')!.id);
        return success(c, quote);
    }
);

app.patch(
    '/vendor/edit-quote',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', EditQuoteSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertRfqVendorQuoteActionAccess(c, data.id, 'update');
        await Promise.all(data.attachments.map((fileId) => assertFileAccess(c, fileId)));
        const quote = await RfqService.editQuote(data, c.get('user')!.id);
        return success(c, quote);
    }
);

app.patch(
    '/vendor/remove',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', RemoveVendorSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertRfqVendorQuoteActionAccess(c, data.id, 'update');
        await RfqService.removeVendor(data, c.get('user')!.id);
        return success(c, null);
    }
);

app.patch(
    '/attachment/add',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', AddRfqAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(c, 'rfq', 'update', 'rfq', data.rfqId);
        await assertFileAccess(c, data.documentId);
        const attachment = await RfqService.addAttachment(data, c.get('user')!.id);
        return success(c, attachment);
    }
);

app.patch(
    '/attachment/remove',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', RemoveRfqAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertRfqAttachmentActionAccess(c, data.id, 'update');
        await RfqService.removeAttachment(data, c.get('user')!.id);
        return success(c, null);
    }
);

app.patch(
    '/award',
    requirePermission({ rfq: ['award'] }),
    zValidator('json', AwardRfqSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertRfqVendorQuoteActionAccess(c, data.quoteId, 'award');
        const rfq = await RfqService.awardRfq(data, c.get('user')!.id);
        return success(c, rfq);
    }
);

app.patch(
    '/un-award',
    requirePermission({ rfq: ['unaward'] }),
    zValidator('json', UnawardRfqSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(c, 'rfq', 'unaward', 'rfq', data.id);
        const rfq = await RfqService.unawardRfq(data, c.get('user')!.id);
        return success(c, rfq);
    }
);

app.patch(
    '/set-void',
    requirePermission({ rfq: ['void'] }),
    zValidator('json', VoidRfqSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectEntityActionAccess(c, 'rfq', 'void', 'rfq', data.id);
        const rfq = await RfqService.setVoid(data, c.get('user')!.id);
        return success(c, rfq);
    }
);

app.post(
    '/:id/void-award',
    requirePermission({ rfq: ['void'] }),
    zValidator('json', VoidAwardSchema),
    async (c) => {
        const id = c.req.param('id');
        await assertProjectEntityActionAccess(c, 'rfq', 'void', 'rfq', id);
        const rfq = await RfqService.voidAwardRfq(id, c.req.valid('json'), c.get('user')!.id);
        return success(c, rfq);
    }
);

app.patch('/:id/set-draft', requirePermission({ rfq: ['state'] }), async (c) => {
    const id = c.req.param('id');
    await assertProjectEntityActionAccess(c, 'rfq', 'state', 'rfq', id);
    const rfq = await RfqService.setDraft(id, c.get('user')!.id);
    return success(c, rfq);
});

app.patch('/:id/set-published', requirePermission({ rfq: ['state'] }), async (c) => {
    const id = c.req.param('id');
    await assertProjectEntityActionAccess(c, 'rfq', 'state', 'rfq', id);
    const rfq = await RfqService.setPublished(id, c.get('user')!.id);
    return success(c, rfq);
});

export default app;
