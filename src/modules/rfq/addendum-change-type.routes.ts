import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddendumChangeTypeCreateSchema,
    AddendumChangeTypeUpdateSchema,
} from './addendum-change-type.models';
import { AddendumChangeTypeService } from './addendum-change-type.services';

const app = new Hono();

app.get('/', requirePermission({ project: ['view-all'] }), async (c) => {
    const types = await AddendumChangeTypeService.list();
    return success(c, types);
});

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', AddendumChangeTypeCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const changeType = await AddendumChangeTypeService.create(data);
        return success(c, changeType, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', AddendumChangeTypeUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const changeType = await AddendumChangeTypeService.update(id, data);
        return success(c, changeType);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await AddendumChangeTypeService.delete(id);
    return success(c, null);
});

export default app;
