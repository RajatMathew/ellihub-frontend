import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    ChangeOrderStatusCreateSchema,
    ChangeOrderStatusUpdateSchema,
} from './change-order-status.models';
import { ChangeOrderStatusService } from './change-order-status.services';

const app = new Hono();

app.get('/', requirePermission({ project: ['view-all'] }), async (c) => {
    const statuses = await ChangeOrderStatusService.list();
    return success(c, statuses);
});

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', ChangeOrderStatusCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const status = await ChangeOrderStatusService.create(data);
        return success(c, status, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', ChangeOrderStatusUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const status = await ChangeOrderStatusService.update(id, data);
        return success(c, status);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await ChangeOrderStatusService.delete(id);
    return success(c, null);
});

export default app;
