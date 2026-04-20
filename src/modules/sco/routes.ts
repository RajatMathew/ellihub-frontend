import { paginationMiddleware } from '@middleware';
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

app.get(
    '/',
    requirePermission({ subChangeOrder: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'createdAt', defaultSortOrder: 'desc' }),
    async (c) => {
        const pagination = c.get('pagination');
        const { data, count } = await ScoService.getScos(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', requirePermission({ subChangeOrder: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const sco = await ScoService.getSco(id);
    return success(c, sco);
});

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
