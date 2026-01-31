import { bodySchema, paramsSchema, querySchema } from '@modules/example/models/example';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';

const app = new Hono();

// Example route with query parameters
app.get('/', zValidator('query', querySchema), async (c: Context) => {
    const query = c.req.query('query');
    return success(c, { query }, 'Query received successfully');
});
// Example route with JSON body
app.post('/', zValidator('json', bodySchema), async (c: Context) => {
    const json = await c.req.json();
    return success(c, json, 'Post data received successfully');
});

// Example route with path parameter
app.get('/:param', zValidator('param', paramsSchema), async (c: Context) => {
    const { param } = c.req.param();
    return success(c, { param }, 'Parameter received successfully');
});

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
        return success(c, { param, query, body }, 'Parameter updated successfully');
    }
);

export default app;
