import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { MonthlyBillsQuerySchema } from './models';
import { MonthlyBillsService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ purchaseOrder: ['read'] }),
    zValidator('query', MonthlyBillsQuerySchema),
    async (c) => {
        const bills = await MonthlyBillsService.list(c.req.valid('query'));
        return success(c, bills);
    }
);

export default app;
