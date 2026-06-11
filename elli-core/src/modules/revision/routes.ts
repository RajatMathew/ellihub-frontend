import { assertRevisionEntityAccess } from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
import { success } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { RevisionEntityTypeSchema } from './models';
import { RevisionService } from './service';

const app = new Hono();

app.get(
    '/:entityType/:entityId',
    requirePermission({ revision: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'version', defaultSortOrder: 'desc' }),
    async (c) => {
        const entityType = RevisionEntityTypeSchema.parse(c.req.param('entityType'));
        const entityId = c.req.param('entityId');
        await assertRevisionEntityAccess(c, entityType, entityId);
        const pagination = c.get('pagination');
        const { data, count } = await RevisionService.list(entityType, entityId, pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', requirePermission({ revision: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const revision = await RevisionService.get(id);
    await assertRevisionEntityAccess(c, revision.entityType, revision.entityId);
    return success(c, revision);
});

export default app;
