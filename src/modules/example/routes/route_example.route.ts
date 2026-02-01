import { bodySchema, paramsSchema, querySchema } from '@modules/example/models/example';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

const app = new Hono();

// Example route with query parameters
app.get('/', zValidator('query', querySchema), async (c: Context) => {
    const query = c.req.query('query');
    return success(c, { query }, 200, 'Query received successfully');
});
// Example route with JSON body
app.post('/', zValidator('json', bodySchema), async (c: Context) => {
    const json = await c.req.json();
    return success(c, json, 200, 'Post data received successfully');
});

// Example route with path parameter
app.get(
    '/:param',
    zValidator('param', paramsSchema),
    requirePermission({ project: ['create'] }),
    async (c: Context) => {
        const { param } = c.req.param();
        return success(c, { param }, 200, 'Parameter received successfully');
    }
);

// Example route with path parameter
app.put(
    '/:param',
    zValidator('param', paramsSchema),
    zValidator('query', querySchema),
    zValidator('json', bodySchema),
    async (c: Context) => {
        const { param } = c.req.param();
        const query = c.req.query('query');
        const body = await c.req.json();
        return success(c, { param, query, body }, 200, 'Parameter updated successfully');
    }
);

export default app;
