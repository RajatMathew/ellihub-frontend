import { success, zValidator } from '@utils';
import { Hono } from 'hono';

import { LookupCreateSchema, LookupUpdateSchema } from './models';
import { LookupService } from './services';

const app = new Hono();

app.get('/', async (c) => {
    const lookups = await LookupService.list();
    return success(c, lookups);
});

app.get('/type/:type', async (c) => {
    const type = c.req.param('type');
    const lookups = await LookupService.listByType(type);
    return success(c, lookups);
});

app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const lookup = await LookupService.get(id);
    return success(c, lookup);
});

app.post('/', zValidator('json', LookupCreateSchema), async (c) => {
    const data = c.req.valid('json');
    const lookup = await LookupService.create(data);
    return success(c, lookup, 201);
});

app.put('/', zValidator('json', LookupUpdateSchema), async (c) => {
    const data = c.req.valid('json');
    const lookup = await LookupService.update(data);
    return success(c, lookup);
});

app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    await LookupService.delete(id);
    return success(c, null);
});

export default app;
