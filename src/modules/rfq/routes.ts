import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { RfqCreateSchema } from './models';
import { RfqService } from './service';

const app = new Hono();

app.post(
    '/',
    requirePermission({ rfq: ['create'] }),
    zValidator('json', RfqCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const rfq = await RfqService.createRfq(data, c.get('user')!.id);
        return success(c, rfq, 201);
    }
);

export default app;
