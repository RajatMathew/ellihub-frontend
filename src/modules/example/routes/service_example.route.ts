import { querySchema } from '@modules/example/models/example';
import { findOneProject } from '@modules/example/service/example';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';

const app = new Hono();

// Example route with pagination middleware
// Example route interacting with the database
app.get('/', zValidator('query', querySchema), async (c: Context) => {
    const query = c.req.query('query');
    // Placeholder for database interaction
    const project = await findOneProject({ id: query || '1' });
    return success(c, project, 'Project fetched successfully');
});

export default app;
