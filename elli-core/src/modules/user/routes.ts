import { getAccessContext, permissionResponseForAccess } from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
import { BadRequestError, success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requireAdminMiddleware } from 'src/middleware/auth';

import {
    roleCreateSchema,
    UserCreateSchema,
    UserPasswordResetSchema,
    UserProfileUpdateSchema,
    UserRoleUpdateSchema,
    UserSuspendSchema,
    UserUpdateSchema,
} from './models';
import { UserService } from './services';

const app = new Hono();

app.get('/me', async (c) => {
    const session = c.get('session');
    const user = c.get('user');
    if (!session || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    return success(c, user);
});

app.get('/me/profile', async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await UserService.getCurrentProfile(user.id);

    return success(c, profile);
});

app.get('/me/access', async (c) => {
    const access = await getAccessContext(c);
    return success(c, permissionResponseForAccess(access));
});

app.patch('/me/profile', zValidator('json', UserProfileUpdateSchema), async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.valid('json');
    const profile = await UserService.updateCurrentProfile(user.id, body);

    return success(c, profile);
});

// Get all users
app.get(
    '/',
    requireAdminMiddleware,
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'desc',
        allowedSortFields: ['name', 'email', 'role', 'emailVerified', 'banned', 'createdAt'],
    }),
    async (c) => {
        const pagination = c.get('pagination');
        const result = await UserService.getAllUsers(c.req.raw.headers, pagination);

        return success(c, result?.users ?? [], 200, 'OK', result?.total ?? 0);
    }
);

// Create user and assign them to the current/default organization
app.post('/', requireAdminMiddleware, zValidator('json', UserCreateSchema), async (c) => {
    const body = await c.req.valid('json');
    const result = await UserService.createUser(body, c.req.raw.headers);

    return success(c, result, 201);
});

// Create org role
app.post('/org-role', requireAdminMiddleware, zValidator('json', roleCreateSchema), async (c) => {
    const body = await c.req.valid('json');
    const result = await UserService.createOrgRole(body, c.req.raw.headers);

    return success(c, result);
});

// Get org roles
app.get('/org-role/list', requireAdminMiddleware, async (c) => {
    const result = await UserService.getOrgRoles(c.req.raw.headers);

    return success(c, result);
});

// Update user profile fields and synchronize Better Auth / organization roles
app.put(
    '/:id',
    requireAdminMiddleware,
    zValidator('json', UserUpdateSchema.omit({ id: true })),
    async (c) => {
        const id = c.req.param('id');
        const body = await c.req.valid('json');
        const result = await UserService.updateUser(
            { id, ...body },
            c.req.raw.headers,
            c.get('user')!.id
        );

        return success(c, result);
    }
);

// Update the Better Auth app role and matching organization membership role
app.patch(
    '/:id/role',
    requireAdminMiddleware,
    zValidator('json', UserRoleUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const body = await c.req.valid('json');
        const result = await UserService.updateUserRole(
            id,
            body,
            c.req.raw.headers,
            c.get('user')!.id
        );

        return success(c, result);
    }
);

app.post(
    '/:id/reset-password',
    requireAdminMiddleware,
    zValidator('json', UserPasswordResetSchema),
    async (c) => {
        const id = c.req.param('id');
        const user = c.get('user');
        if (user?.id === id) {
            throw new BadRequestError('Use the profile security page to change your own password');
        }

        const body = await c.req.valid('json');
        const result = await UserService.resetUserPassword(id, body, c.req.raw.headers);

        return success(c, result);
    }
);

app.post(
    '/:id/suspend',
    requireAdminMiddleware,
    zValidator('json', UserSuspendSchema),
    async (c) => {
        const id = c.req.param('id');
        const user = c.get('user');
        if (user?.id === id) throw new BadRequestError('You cannot suspend your own account');

        const body = await c.req.valid('json');
        const result = await UserService.suspendUser(id, body, c.req.raw.headers);

        return success(c, result);
    }
);

app.post('/:id/unsuspend', requireAdminMiddleware, async (c) => {
    const id = c.req.param('id');
    const user = c.get('user');
    if (user?.id === id) throw new BadRequestError('You cannot unsuspend your own account');

    const result = await UserService.unsuspendUser(id, c.req.raw.headers);

    return success(c, result);
});

// Remove the user; organization membership is removed by Better Auth/Prisma cascade
app.delete('/:id', requireAdminMiddleware, async (c) => {
    const id = c.req.param('id');
    await UserService.removeUser(id, c.req.raw.headers);

    return success(c, null);
});

// Get user by ID
app.get('/:id', requireAdminMiddleware, async (c) => {
    const id = c.req.param('id');
    const user = await UserService.getUser(id);
    return success(c, user);
});

export default app;
