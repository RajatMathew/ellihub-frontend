import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { GCTypeCreateSchema, GCTypeUpdateSchema } from '../models/gc-type.models';
import { GCTypeService } from '../services/gc-type.services';

const app = new Hono();

app.get('/', requirePermission({ gcType: ['read'] }), async (c) => {
    const types = await GCTypeService.getGCTypes();
    return success(c, types);
});

app.post(
    '/',
    requirePermission({ gcType: ['create'] }),
    zValidator('json', GCTypeCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const gcType = await GCTypeService.createGCType(data);
        return success(c, gcType, 201);
    }
);

app.put(
    '/:id',
    requirePermission({ gcType: ['update'] }),
    zValidator('json', GCTypeUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const gcType = await GCTypeService.updateGCType(id, data);
        return success(c, gcType);
    }
);

app.delete('/:id', requirePermission({ gcType: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await GCTypeService.deleteGCType(id);
    return success(c, null);
});

export default app;
