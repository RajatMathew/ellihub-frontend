import { success, zValidator } from '@utils';
import { Hono } from 'hono';

import { roleCreateSchema, UserProfileUpdateSchema } from './models';
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
app.get('/', async (c) => {
    console.log('Fetching all users');
    const result = await UserService.getAllUsers(c.req.raw.headers);

    return success(c, result?.users);
});

// Create org role
app.post('/org-role', zValidator('json', roleCreateSchema), async (c) => {
    const body = await c.req.valid('json');
    const result = await UserService.createOrgRole(body, c.req.raw.headers);

    return success(c, result);
});

// Get org roles
app.get('/org-role/list', async (c) => {
    const result = await UserService.getOrgRoles(c.req.raw.headers);

    return success(c, result);
});

// Get user by ID
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const user = await UserService.getUser(id);
    return success(c, user);
});

export default app;
