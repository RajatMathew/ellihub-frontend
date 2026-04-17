import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { ActivityActionSchema, ActivityEntityTypeSchema, ActivityLogCreateSchema } from './models';
import { ActivityLogService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ activityLog: ['read'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'desc',
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const q = c.req.query();

        const filter: Parameters<typeof ActivityLogService.list>[1] = {};
        if (q.userId) filter.userId = q.userId;
        if (q.entityType) filter.entityType = ActivityEntityTypeSchema.parse(q.entityType);
        if (q.entityId) filter.entityId = q.entityId;
        if (q.action) filter.action = ActivityActionSchema.parse(q.action);
        if (q.from) filter.from = new Date(q.from);
        if (q.to) filter.to = new Date(q.to);

        const { data, count } = await ActivityLogService.list(pagination, filter);
        return success(c, data, 200, 'OK', count);
    }
);

app.get(
    '/entity/:entityType/:entityId',
    requirePermission({ activityLog: ['read'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'desc',
    }),
    async (c) => {
        const entityType = ActivityEntityTypeSchema.parse(c.req.param('entityType'));
        const entityId = c.req.param('entityId');
        const pagination = c.get('pagination');
        const { data, count } = await ActivityLogService.getForEntity(
            entityType,
            entityId,
            pagination
        );
        return success(c, data, 200, 'OK', count);
    }
);

app.post(
    '/',
    requirePermission({ activityLog: ['create'] }),
    zValidator('json', ActivityLogCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const entry = await ActivityLogService.log({
            userId,
            entityType: data.entityType,
            entityId: data.entityId,
            action: data.action,
            description: data.description,
            note: data.note ?? undefined,
        });
        return success(c, entry, 201);
    }
);

export default app;
