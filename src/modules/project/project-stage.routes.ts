import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { ProjectStageCreateSchema, ProjectStageUpdateSchema } from './project-stage.models';
import { ProjectStageService } from './project-stage.services';

const app = new Hono();

app.get('/', requirePermission({ project: ['view-all'] }), async (c) => {
    const stages = await ProjectStageService.list();
    return success(c, stages);
});

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', ProjectStageCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const stage = await ProjectStageService.create(data);
        return success(c, stage, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', ProjectStageUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const stage = await ProjectStageService.update(id, data);
        return success(c, stage);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await ProjectStageService.delete(id);
    return success(c, null);
});

export default app;
