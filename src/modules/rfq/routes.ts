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
