import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { PCOChangeTypeCreateSchema, PCOChangeTypeUpdateSchema } from './pco-change-type.models';
import { PCOChangeTypeService } from './pco-change-type.services';

const app = new Hono();

app.get('/', requirePermission({ project: ['view-all'] }), async (c) => {
    const types = await PCOChangeTypeService.list();
    return success(c, types);
});

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOChangeTypeCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const changeType = await PCOChangeTypeService.create(data);
        return success(c, changeType, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOChangeTypeUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const changeType = await PCOChangeTypeService.update(id, data);
        return success(c, changeType);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await PCOChangeTypeService.delete(id);
    return success(c, null);
});

export default app;
