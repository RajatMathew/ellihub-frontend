import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { InvoiceCreateSchema } from './models';
import { InvoiceService } from './service';

const app = new Hono();

app.post(
    '/',
    requirePermission({ invoice: ['create'] }),
    zValidator('json', InvoiceCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const invoice = await InvoiceService.createInvoice(data, c.get('user')!.id);
        return success(c, invoice, 201);
    }
);

export default app;
