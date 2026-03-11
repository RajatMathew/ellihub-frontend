import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { RFQStatusCreateSchema, RFQStatusUpdateSchema } from './rfq-status.models';
import { RFQStatusService } from './rfq-status.services';

const app = new Hono();

app.get('/', requirePermission({ project: ['view-all'] }), async (c) => {
    const statuses = await RFQStatusService.list();
    return success(c, statuses);
});

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', RFQStatusCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const status = await RFQStatusService.create(data);
        return success(c, status, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', RFQStatusUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const status = await RFQStatusService.update(id, data);
        return success(c, status);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await RFQStatusService.delete(id);
    return success(c, null);
});

export default app;
