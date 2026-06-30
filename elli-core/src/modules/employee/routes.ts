import { assertEmployeeSelfOrAdmin } from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requireAnyPermission, requirePermission } from 'src/middleware/auth';

import {
    AddEmployeeDocumentSchema,
    EmployeeCreateSchema,
    EmployeeLinkUserSchema,
    EmployeeUpdateSchema,
    RemoveEmployeeDocumentSchema,
} from './models';
import { EmployeeService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ employee: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'name', defaultSortOrder: 'asc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const { data, count } = await EmployeeService.list(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/stats', requirePermission({ employee: ['read'] }), async (c) => {
    const stats = await EmployeeService.getStats();
    return success(c, stats);
});

app.post(
    '/',
    requirePermission({ employee: ['create'] }),
    zValidator('json', EmployeeCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const employee = await EmployeeService.create(data, c.get('user')!.id, c.req.raw.headers);
        return success(c, employee, 201);
    }
);

app.get(
    '/:id/projects',
    requireAnyPermission([{ employee: ['read'] }, { employee: ['read-own'] }]),
    async (c) => {
        const id = c.req.param('id');
        await assertEmployeeSelfOrAdmin(c, id);
        const projects = await EmployeeService.getProjects(id);
        return success(c, projects);
    }
);

app.get(
    '/:id',
    requireAnyPermission([{ employee: ['read'] }, { employee: ['read-own'] }]),
    async (c) => {
        const id = c.req.param('id');
        await assertEmployeeSelfOrAdmin(c, id);
        const employee = await EmployeeService.get(id);
        return success(c, employee);
    }
);

app.put(
    '/',
    requirePermission({ employee: ['update'] }),
    zValidator('json', EmployeeUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const employee = await EmployeeService.update(data, c.get('user')!.id);
        return success(c, employee);
    }
);

app.post(
    '/:id/user',
    requirePermission({ employee: ['link-user'] }),
    zValidator('json', EmployeeLinkUserSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const employee = await EmployeeService.linkUser(
            id,
            data,
            c.get('user')!.id,
            c.req.raw.headers
        );
        return success(c, employee);
    }
);

app.delete('/:id/user', requirePermission({ employee: ['link-user'] }), async (c) => {
    const id = c.req.param('id');
    const employee = await EmployeeService.unlinkUser(id, c.get('user')!.id, c.req.raw.headers);
    return success(c, employee);
});

app.delete('/:id', requirePermission({ employee: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await EmployeeService.delete(id, c.get('user')!.id, c.req.raw.headers);
    return success(c, null, 200, 'Employee deleted');
});

app.patch(
    '/document/add',
    requirePermission({ employee: ['update'] }),
    zValidator('json', AddEmployeeDocumentSchema),
    async (c) => {
        const data = c.req.valid('json');
        const document = await EmployeeService.addDocument(data, c.get('user')!.id);
        return success(c, document);
    }
);

app.patch(
    '/document/remove',
    requirePermission({ employee: ['update'] }),
    zValidator('json', RemoveEmployeeDocumentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await EmployeeService.removeDocument(data, c.get('user')!.id);
        return success(c, null);
    }
);

export default app;
