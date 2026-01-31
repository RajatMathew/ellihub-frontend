import { paginationMiddleware } from '@middleware';
import { success } from '@utils';
import { Context, Hono } from 'hono';

import cExampleSub from './db_example_sub.route';

const app = new Hono();

// Example route with pagination middleware
app.get('/', paginationMiddleware({ defaultSize: 5 }), async (c: Context) => {
    const { skip, take } = c.get('pagination');
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));
    const paginatedItems = items.slice(skip, skip + take);
    return success(c, paginatedItems, 'Paginated items fetched successfully', items.length);
});

app.route('/db', cExampleSub);

export default app;
