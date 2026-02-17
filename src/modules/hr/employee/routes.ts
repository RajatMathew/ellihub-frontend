import { success, zValidator } from '@utils';
import { Hono } from 'hono';

import { EmployeeCreateSchema } from './models';
import { EmployeeService } from './service';

const app = new Hono();

app.post(
    '/',
    // requirePermission({ employee: ['create'] }),
    zValidator('json', EmployeeCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const employee = await EmployeeService.create(data);
        return success(c, employee, 201);
    }
);

export default app;
