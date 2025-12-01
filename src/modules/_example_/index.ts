import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';

import { bodySchema, paramsSchema, querySchema } from './models/query';
import { findAllProjects } from './service/findAll';
import { findOneProject } from './service/findOne';

const app = new Hono();

app.get('/', zValidator('query', querySchema), async (c: Context) => {
  const query = c.req.query('query');
  return success(c, { query }, 'Query received successfully');
});

app.post('/', zValidator('json', querySchema), async (c: Context) => {
  const json = await c.req.json();
  return success(c, json, 'Post data received successfully');
});

// Example route with pagination middleware
app.get('/pagination', paginationMiddleware({ defaultSize: 5 }), async (c: Context) => {
  const { skip, take } = c.get('pagination');
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
  const paginatedItems = items.slice(skip, skip + take);
  return success(c, paginatedItems, 'Paginated items fetched successfully', items.length);
});

app.get('/db-test', async (c: Context) => {
  // Placeholder for database interaction
  const project = await findOneProject({ id: '1' });

  return success(c, project, 'Project fetched successfully');
});

app.get('/db-test-pagination', paginationMiddleware({ defaultSize: 10 }), async (c: Context) => {
  const pagination = c.get('pagination');
  const { data, count } = await findAllProjects({ pagination });
  return success(c, data, 'Paginated projects fetched successfully', count);
});

app.get('/:param', zValidator('param', paramsSchema), async (c: Context) => {
  const { param } = c.req.param();
  return success(c, { param }, 'Parameter received successfully');
});

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
