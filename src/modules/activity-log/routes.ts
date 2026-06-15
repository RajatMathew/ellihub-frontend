import { assertActivityEntityAccess, getAccessContext } from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    ActivityEntityTypeSchema,
    ActivityLogCreateSchema,
    ActivityLogListQuerySchema,
} from './models';
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
        const filter = ActivityLogListQuerySchema.parse(c.req.query());
        const requestedEntityType = filter.entityType;

        const access = await getAccessContext(c);
        if (!access.isAdmin) {
            if (requestedEntityType && filter.entityId) {
                await assertActivityEntityAccess(c, requestedEntityType, filter.entityId);
            } else {
                filter.userId = access.userId;
            }
        }

        const { data, count } = await ActivityLogService.list(pagination, filter);
        return success(c, data, 200, 'OK', count);
    }
);

app.get(
    '/employee/:employeeId',
    requirePermission({ activityLog: ['read'] }),
    paginationMiddleware({
        defaultSize: 100,
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'desc',
    }),
    async (c) => {
        const employeeId = c.req.param('employeeId');
        await assertActivityEntityAccess(c, 'employee', employeeId);
        const pagination = c.get('pagination');
        const { data, count } = await ActivityLogService.getForEmployee(employeeId, pagination);
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
        await assertActivityEntityAccess(c, entityType, entityId);
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
