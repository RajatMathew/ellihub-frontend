import { assertActivityEntityAccess } from '@lib/access';
import { prisma } from '@lib/prisma';
import { BadRequestError, success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { readMailAsset } from './asset-service';
import { MailFeatureService } from './feature-service';
import { sendLoggedMail } from './log-service';
import { getSenderMailboxes, isAllowedSender } from './mailboxes';
import {
    FeatureMailActionSchema,
    FeatureMailQuerySchema,
    MailSendSchema,
    type FeatureMailKey,
} from './models';

const app = new Hono();

app.get('/senders', requirePermission({ mail: ['send'] }), (c) => {
    return success(c, getSenderMailboxes(), 200, 'OK', undefined, 'senders');
});

app.get('/assets/:fileName', requirePermission({ mail: ['send'] }), async (c) => {
    const asset = await readMailAsset(c.req.param('fileName'));

    return new Response(getResponseBody(asset.bytes), {
        status: 200,
        headers: {
            'Content-Type': asset.contentType,
            'Cache-Control': 'private, max-age=3600',
        },
    });
});

app.get(
    '/features/draft',
    requirePermission({ mail: ['send'] }),
    zValidator('query', FeatureMailQuerySchema),
    async (c) => {
        const request = c.req.valid('query');
        await assertFeatureMailAccess(c, request.feature, request.entityId);
        const draft = await MailFeatureService.getDraft(request, {
            requestedBy: getRequestedBy(c),
            userId: c.get('user')!.id,
        });
        return success(c, draft);
    }
);

app.post(
    '/features/preview',
    requirePermission({ mail: ['send'] }),
    zValidator('json', FeatureMailActionSchema),
    async (c) => {
        const request = c.req.valid('json');
        await assertFeatureMailAccess(c, request.feature, request.entityId);
        const draft = await MailFeatureService.preview(request, {
            requestedBy: getRequestedBy(c),
            userId: c.get('user')!.id,
        });
        return success(c, draft);
    }
);

app.post(
    '/features/send',
    requirePermission({ mail: ['send'] }),
    zValidator('json', FeatureMailActionSchema),
    async (c) => {
        const request = c.req.valid('json');
        await assertFeatureMailAccess(c, request.feature, request.entityId);
        const result = await MailFeatureService.send(request, {
            requestedBy: getRequestedBy(c),
            userId: c.get('user')!.id,
        });
        return success(c, result);
    }
);

app.post(
    '/send',
    requirePermission({ mail: ['send'] }),
    zValidator('json', MailSendSchema),
    async (c) => {
        const data = c.req.valid('json');

        if (!isAllowedSender(data.from)) {
            throw new BadRequestError('Selected sender is not allowed');
        }

        await sendLoggedMail(data, {
            feature: 'raw',
            createdBy: c.get('user')!.id,
        });
        return success(c, null);
    }
);

export default app;

function getRequestedBy(c: Context): string {
    const user = c.get('user');
    return user?.name || user?.email || 'Elli NY Design Corp';
}

async function assertFeatureMailAccess(c: Context, feature: FeatureMailKey, entityId: string) {
    if (feature === 'rfq.vendorRequest' || feature === 'rfq.awardNotice') {
        const quote = await prisma.rFQVendorQuote.findUnique({
            where: { id: entityId },
            select: { rfqId: true },
        });

        if (!quote) throw new BadRequestError('RFQ vendor invite not found');
        await assertActivityEntityAccess(c, 'rfq', quote.rfqId);
        return;
    }

    if (feature === 'rfq.vendorRequestAll') {
        await assertActivityEntityAccess(c, 'rfq', entityId);
        return;
    }

    if (feature === 'purchaseOrder.vendorIssue') {
        await assertActivityEntityAccess(c, 'purchaseOrder', entityId);
        return;
    }

    if (feature === 'subChangeOrder.vendorApproval') {
        await assertActivityEntityAccess(c, 'subChangeOrder', entityId);
    }
}

function getResponseBody(content: Uint8Array): ArrayBuffer {
    const body = new Uint8Array(content.byteLength);
    body.set(content);
    return body.buffer;
}
