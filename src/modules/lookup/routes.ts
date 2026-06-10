import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { LookupCreateSchema, LookupUpdateSchema } from './models';
import { LookupService } from './services';

const app = new Hono();

app.get('/', requirePermission({ lookup: ['read'] }), async (c) => {
    const lookups = await LookupService.list();
    return success(c, lookups);
});

app.get('/type/:type', requirePermission({ lookup: ['read'] }), async (c) => {
    const type = c.req.param('type');
    const lookups = await LookupService.listByType(type);
    return success(c, lookups);
});

app.get('/:id', requirePermission({ lookup: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const lookup = await LookupService.get(id);
    return success(c, lookup);
});

app.post(
    '/',
    requirePermission({ lookup: ['create'] }),
    zValidator('json', LookupCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const lookup = await LookupService.create(data);
        return success(c, lookup, 201);
    }
);

app.put(
    '/',
    requirePermission({ lookup: ['update'] }),
    zValidator('json', LookupUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const lookup = await LookupService.update(data);
        return success(c, lookup);
    }
);

app.delete('/:id', requirePermission({ lookup: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await LookupService.delete(id);
    return success(c, null);
});

export default app;
