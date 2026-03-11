import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { InvoiceStatusCreateSchema, InvoiceStatusUpdateSchema } from './invoice-status.models';
import { InvoiceStatusService } from './invoice-status.services';

const app = new Hono();

app.get('/', requirePermission({ project: ['view-all'] }), async (c) => {
    const statuses = await InvoiceStatusService.list();
    return success(c, statuses);
});

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', InvoiceStatusCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const status = await InvoiceStatusService.create(data);
        return success(c, status, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', InvoiceStatusUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const status = await InvoiceStatusService.update(id, data);
        return success(c, status);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await InvoiceStatusService.delete(id);
    return success(c, null);
});

export default app;
