import { paginationMiddleware } from '@middleware';
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
        const { data, count } = await RfqService.getRfqs(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', requirePermission({ rfq: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const rfq = await RfqService.getRfq(id);
    return success(c, rfq);
});

app.post(
    '/',
    requirePermission({ rfq: ['create'] }),
    zValidator('json', RfqCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
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
        const rfq = await RfqService.updateRfq(data, c.get('user')!.id);
        return success(c, rfq);
    }
);

app.patch(
    '/vendor/add',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', AddVendorSchema),
    async (c) => {
        const data = c.req.valid('json');
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
        const pdf = await RfqService.generateVendorPdf(
            c.req.param('id'),
            getRequestedBy(c),
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

app.patch(
    '/vendor/decline-quote',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', DeclineQuoteSchema),
    async (c) => {
        const data = c.req.valid('json');
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
        await RfqService.removeAttachment(data, c.get('user')!.id);
        return success(c, null);
    }
);

app.patch(
    '/award',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', AwardRfqSchema),
    async (c) => {
        const data = c.req.valid('json');
        const rfq = await RfqService.awardRfq(data, c.get('user')!.id);
        return success(c, rfq);
    }
);

app.patch(
    '/un-award',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', UnawardRfqSchema),
    async (c) => {
        const data = c.req.valid('json');
        const rfq = await RfqService.unawardRfq(data, c.get('user')!.id);
        return success(c, rfq);
    }
);

app.patch(
    '/set-void',
    requirePermission({ rfq: ['update'] }),
    zValidator('json', VoidRfqSchema),
    async (c) => {
        const data = c.req.valid('json');
        const rfq = await RfqService.setVoid(data, c.get('user')!.id);
        return success(c, rfq);
    }
);

app.patch('/:id/set-draft', requirePermission({ rfq: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const rfq = await RfqService.setDraft(id, c.get('user')!.id);
    return success(c, rfq);
});

app.patch('/:id/set-published', requirePermission({ rfq: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const rfq = await RfqService.setPublished(id, c.get('user')!.id);
    return success(c, rfq);
});

export default app;
