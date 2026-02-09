import { success, zValidator } from '@utils';
import { Hono } from 'hono';

import { roleCreateSchema } from './models';
import { UserService } from './services';

const app = new Hono();

// Get all users
app.get('/', async (c) => {
    console.log('Fetching all users');
    const result = await UserService.getAllUsers(c.req.raw.headers);

    return success(c, result?.users);
});

// Get user by ID
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const user = await UserService.getUser(id);
    return success(c, user);
});

app.get('/me', async (c) => {
    const session = c.get('session');
    if (!session) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = c.get('user');
    return success(c, user);
});

// Create org role
app.post('/org-role', zValidator('json', roleCreateSchema), async (c) => {
    const body = await c.req.valid('json');
    const result = await UserService.createOrgRole(body, c.req.raw.headers);

    return success(c, result);
});

// Get org roles
app.get('/org-role', async (c) => {
    const result = await UserService.getOrgRoles(c.req.raw.headers);

    return success(c, result);
});

export default app;
