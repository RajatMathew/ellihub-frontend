import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { QuoteStatusCreateSchema, QuoteStatusUpdateSchema } from './quote-status.models';
import { QuoteStatusService } from './quote-status.services';

const app = new Hono();

app.get('/', requirePermission({ project: ['view-all'] }), async (c) => {
    const statuses = await QuoteStatusService.list();
    return success(c, statuses);
});

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', QuoteStatusCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const status = await QuoteStatusService.create(data);
        return success(c, status, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', QuoteStatusUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const status = await QuoteStatusService.update(id, data);
        return success(c, status);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await QuoteStatusService.delete(id);
    return success(c, null);
});

export default app;
