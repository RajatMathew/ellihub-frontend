import { getAccessContext } from '@lib/access';
import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { PTOCreateSchema, PTOReviewSchema, PTOUpdateSchema } from './models';
import { PTOService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ leave: ['view'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'startDate', defaultSortOrder: 'desc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const access = await getAccessContext(c);
        const { data, count } = await PTOService.list(pagination, access);
        return success(c, data, 200, 'OK', count);
    }
);

app.post(
    '/',
    requirePermission({ leave: ['create'] }),
    zValidator('json', PTOCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const access = await getAccessContext(c);
        const pto = await PTOService.create(data, access);
        return success(c, pto, 201);
    }
);

app.get('/:id', requirePermission({ leave: ['view'] }), async (c) => {
    const id = c.req.param('id');
    const access = await getAccessContext(c);
    const pto = await PTOService.get(id, access);
    return success(c, pto);
});

app.put(
    '/',
    requirePermission({ leave: ['create'] }),
    zValidator('json', PTOUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const access = await getAccessContext(c);
        const pto = await PTOService.update(data, access);
        return success(c, pto);
    }
);

app.delete('/:id', requirePermission({ leave: ['create'] }), async (c) => {
    const id = c.req.param('id');
    const access = await getAccessContext(c);
    await PTOService.delete(id, access);
    return success(c, null, 200, 'PTO deleted');
});

app.patch(
    '/approve',
    requirePermission({ leave: ['approve'] }),
    zValidator('json', PTOReviewSchema),
    async (c) => {
        const data = c.req.valid('json');
        const pto = await PTOService.approve(data, c.get('user')!.id);
        return success(c, pto);
    }
);

app.patch(
    '/reject',
    requirePermission({ leave: ['approve'] }),
    zValidator('json', PTOReviewSchema),
    async (c) => {
        const data = c.req.valid('json');
        const pto = await PTOService.reject(data, c.get('user')!.id);
        return success(c, pto);
    }
);

export default app;
