import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { PoCreateSchema } from './models';
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

export default app;
