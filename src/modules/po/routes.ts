import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    PoCreateSchema,
    SetPoCancelledSchema,
    SetPoDeliveredSchema,
    SetPoDraftSchema,
    SetPoIssuedSchema,
} from './models';
import { PoService } from './service';

const app = new Hono();

app.post(
    '/',
    requirePermission({ purchaseOrder: ['create'] }),
    zValidator('json', PoCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const po = await PoService.createPurchaseOrder(data, c.get('user')!.id);
        return success(c, po, 201);
    }
);

app.post('/from-rfq/:rfqId', requirePermission({ purchaseOrder: ['create'] }), async (c) => {
    const rfqId = c.req.param('rfqId');
    const po = await PoService.createFromRfq(rfqId, c.get('user')!.id);
    return success(c, po, 201);
});

app.patch(
    '/set-draft',
    requirePermission({ purchaseOrder: ['update'] }),
    zValidator('json', SetPoDraftSchema),
    async (c) => {
        const data = c.req.valid('json');
        const po = await PoService.setDraft(data, c.get('user')!.id);
        return success(c, po);
    }
);

app.patch(
    '/set-issued',
    requirePermission({ purchaseOrder: ['update'] }),
    zValidator('json', SetPoIssuedSchema),
    async (c) => {
        const data = c.req.valid('json');
        const po = await PoService.setIssued(data, c.get('user')!.id);
        return success(c, po);
    }
);

app.patch(
    '/set-delivered',
    requirePermission({ purchaseOrder: ['update'] }),
    zValidator('json', SetPoDeliveredSchema),
    async (c) => {
        const data = c.req.valid('json');
        const po = await PoService.setDelivered(data, c.get('user')!.id);
        return success(c, po);
    }
);

app.patch(
    '/set-cancelled',
    requirePermission({ purchaseOrder: ['update'] }),
    zValidator('json', SetPoCancelledSchema),
    async (c) => {
        const data = c.req.valid('json');
        const po = await PoService.setCancelled(data, c.get('user')!.id);
        return success(c, po);
    }
);

export default app;
