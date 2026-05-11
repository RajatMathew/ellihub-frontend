import { paginationMiddleware } from '@middleware';
import { success } from '@utils';
import { Hono } from 'hono';

import { RevisionEntityTypeSchema } from './models';
import { RevisionService } from './service';

const app = new Hono();

app.get(
    '/:entityType/:entityId',
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'version', defaultSortOrder: 'desc' }),
    async (c) => {
        const entityType = RevisionEntityTypeSchema.parse(c.req.param('entityType'));
        const entityId = c.req.param('entityId');
        const pagination = c.get('pagination');
        const { data, count } = await RevisionService.list(entityType, entityId, pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const revision = await RevisionService.get(id);
    return success(c, revision);
});

export default app;
