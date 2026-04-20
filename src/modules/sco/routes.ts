import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddScoAttachmentSchema,
    RemoveScoAttachmentSchema,
    ScoCreateSchema,
    ScoUpdateSchema,
} from './models';
import { ScoService } from './service';

const app = new Hono();

app.post(
    '/',
    requirePermission({ subChangeOrder: ['create'] }),
    zValidator('json', ScoCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const sco = await ScoService.createSco(data, c.get('user')!.id);
        return success(c, sco, 201);
    }
);

app.put(
    '/',
    requirePermission({ subChangeOrder: ['update'] }),
    zValidator('json', ScoUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const sco = await ScoService.updateSco(data, c.get('user')!.id);
        return success(c, sco);
    }
);

app.patch(
    '/attachment/add',
    requirePermission({ subChangeOrder: ['update'] }),
    zValidator('json', AddScoAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        const attachment = await ScoService.addAttachment(data, c.get('user')!.id);
        return success(c, attachment);
    }
);

app.patch(
    '/attachment/remove',
    requirePermission({ subChangeOrder: ['update'] }),
    zValidator('json', RemoveScoAttachmentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await ScoService.removeAttachment(data, c.get('user')!.id);
        return success(c, null);
    }
);

export default app;
