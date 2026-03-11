import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { ProjectStatusCreateSchema, ProjectStatusUpdateSchema } from './project-status.models';
import { ProjectStatusService } from './project-status.services';

const app = new Hono();

app.get('/', requirePermission({ project: ['view-all'] }), async (c) => {
    const statuses = await ProjectStatusService.list();
    return success(c, statuses);
});

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', ProjectStatusCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const status = await ProjectStatusService.create(data);
        return success(c, status, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', ProjectStatusUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const status = await ProjectStatusService.update(id, data);
        return success(c, status);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await ProjectStatusService.delete(id);
    return success(c, null);
});

export default app;
