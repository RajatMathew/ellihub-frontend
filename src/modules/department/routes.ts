import { paginationMiddleware } from '@middleware/pagination';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    DepartmentAssignEmployeeSchema,
    DepartmentCreateSchema,
    DepartmentRemoveEmployeeSchema,
    DepartmentUpdateSchema,
} from './models';
import { DepartmentService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ department: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'name', defaultSortOrder: 'asc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const { data, count } = await DepartmentService.list(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.post(
    '/',
    requirePermission({ department: ['create'] }),
    zValidator('json', DepartmentCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const department = await DepartmentService.create(data, c.get('user')!.id);
        return success(c, department, 201);
    }
);

app.get('/:id', requirePermission({ department: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const department = await DepartmentService.get(id);
    return success(c, department);
});

app.put(
    '/',
    requirePermission({ department: ['update'] }),
    zValidator('json', DepartmentUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const department = await DepartmentService.update(data, c.get('user')!.id);
        return success(c, department);
    }
);

app.delete('/:id', requirePermission({ department: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await DepartmentService.delete(id, c.get('user')!.id);
    return success(c, null, 200, 'Department deleted');
});

app.patch(
    '/employee/assign',
    requirePermission({ department: ['update'] }),
    zValidator('json', DepartmentAssignEmployeeSchema),
    async (c) => {
        const data = c.req.valid('json');
        const assignment = await DepartmentService.assignEmployee(data, c.get('user')!.id);
        return success(c, assignment);
    }
);

app.patch(
    '/employee/remove',
    requirePermission({ department: ['update'] }),
    zValidator('json', DepartmentRemoveEmployeeSchema),
    async (c) => {
        const data = c.req.valid('json');
        await DepartmentService.removeEmployee(data, c.get('user')!.id);
        return success(c, null);
    }
);

export default app;
