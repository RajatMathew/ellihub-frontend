import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { POStatusCreateSchema, POStatusUpdateSchema } from './po-status.models';
import { POStatusService } from './po-status.services';

const app = new Hono();

app.get('/', requirePermission({ project: ['view-all'] }), async (c) => {
    const statuses = await POStatusService.list();
    return success(c, statuses);
});

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', POStatusCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const status = await POStatusService.create(data);
        return success(c, status, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', POStatusUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const status = await POStatusService.update(id, data);
        return success(c, status);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await POStatusService.delete(id);
    return success(c, null);
});

export default app;
