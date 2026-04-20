import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { RfqCreateSchema } from './models';
import { RfqService } from './service';

const app = new Hono();

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
