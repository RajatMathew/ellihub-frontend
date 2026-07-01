import { assertActivityEntityAccess, getAccessContext } from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
import { ForbiddenError, success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    ActivityCommentCreateSchema,
    ActivityCommentUpdateSchema,
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
    '/entity/:entityType/:entityId/comments',
    requirePermission({ activityLog: ['create'] }),
    zValidator('json', ActivityCommentCreateSchema),
    async (c) => {
        const entityType = ActivityEntityTypeSchema.parse(c.req.param('entityType'));
        const entityId = c.req.param('entityId');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;

        await assertActivityEntityAccess(c, entityType, entityId);

        const entry = await ActivityLogService.createComment({
            userId,
            entityType,
            entityId,
            note: data.note,
        });
        return success(c, entry, 201);
    }
);

app.patch(
    '/comments/:commentId',
    requirePermission({ activityLog: ['create'] }),
    zValidator('json', ActivityCommentUpdateSchema),
    async (c) => {
        const commentId = c.req.param('commentId');
        const userId = c.get('user')!.id;
        const data = c.req.valid('json');
        const comment = await ActivityLogService.getOwnCommentForMutation(commentId, userId);

        await assertActivityEntityAccess(c, comment.entityType, comment.entityId);

        const entry = await ActivityLogService.updateComment(commentId, data.note);
        return success(c, entry);
    }
);

app.delete('/comments/:commentId', requirePermission({ activityLog: ['create'] }), async (c) => {
    const commentId = c.req.param('commentId');
    const userId = c.get('user')!.id;
    const comment = await ActivityLogService.getOwnCommentForMutation(commentId, userId);

    await assertActivityEntityAccess(c, comment.entityType, comment.entityId);

    const entry = await ActivityLogService.deleteComment(commentId, userId);
    return success(c, entry);
});

app.post(
    '/',
    requirePermission({ activityLog: ['create'] }),
    zValidator('json', ActivityLogCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const access = await getAccessContext(c);

        if (!access.isAdmin) {
            throw new ForbiddenError('Only admins can create arbitrary activity entries');
        }

        await assertActivityEntityAccess(c, data.entityType, data.entityId);

        const entry = await ActivityLogService.log({
            userId: access.userId,
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
