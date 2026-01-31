import { paginationMiddleware } from '@middleware';
import { findAllProjects } from '@modules/example/service/example';
import { success } from '@utils';
import { Context, Hono } from 'hono';

const app = new Hono();
// Example route interacting with the database with pagination
app.get('/', paginationMiddleware({ defaultSize: 10 }), async (c: Context) => {
    const pagination = c.get('pagination');
    const { data, count } = await findAllProjects({ pagination });
    return success(c, data, 'Paginated projects fetched successfully', count);
});
export default app;
