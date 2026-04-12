import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { EmployeeCreateSchema, EmployeeUpdateSchema } from './models';
import { EmployeeService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'name', defaultSortOrder: 'asc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const { data, count } = await EmployeeService.list(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.post(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', EmployeeCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const employee = await EmployeeService.create(data, c.get('user')!.id);
        return success(c, employee, 201);
    }
);

app.get('/:id', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const employee = await EmployeeService.get(id);
    return success(c, employee);
});

app.put(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', EmployeeUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const employee = await EmployeeService.update(data);
        return success(c, employee);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await EmployeeService.delete(id);
    return success(c, null, 200, 'Employee deleted');
});

export default app;
