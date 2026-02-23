import { success, zValidator } from '@utils';
import { Hono } from 'hono';

import { ProjectCreateSchema } from './models';
import { ProjectService } from './service';

export const app = new Hono();

app.post('/', zValidator('json', ProjectCreateSchema), async (c) => {
    const data = c.req.valid('json');
    const project = await ProjectService.createProject(data, c.get('user')!.id);
    return success(c, project, 201);
});

export default app;
