import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { PCOCreateSchema, PCOStatusTransitionSchema, PCOUpdateSchema } from './models';
import { PCOService } from './services';

const app = new Hono();

app.get(
    '/',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'date', defaultSortOrder: 'desc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { projectId, status, changeTypeId, priority, dateFrom, dateTo } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(projectId && { projectId }),
            ...(status && { status }),
            ...(changeTypeId && { changeTypeId }),
            ...(priority && { priority }),
            ...(dateFrom && { dateFrom }),
            ...(dateTo && { dateTo }),
        };

        const { data, count } = await PCOService.listPCOs(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const pco = await PCOService.createPCO(data, userId);
        return success(c, pco, 201);
    }
);

app.get('/:id', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const pco = await PCOService.getPCO(id);
    return success(c, pco);
});

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const pco = await PCOService.updatePCO(id, data);
        return success(c, pco);
    }
);

app.put(
    '/:id/status',
    requirePermission({ project: ['update'] }),
    zValidator('json', PCOStatusTransitionSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const pco = await PCOService.transitionStatus(id, data, userId);
        return success(c, pco);
    }
);

app.delete('/:id', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    await PCOService.deletePCO(id);
    return success(c, null, 200, 'Prime Change Order deleted');
});

export default app;
