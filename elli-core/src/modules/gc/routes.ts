import { assertFileAccess } from '@lib/access';
import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddGcDocumentSchema,
    GcCreateSchema,
    GcUpdateSchema,
    RemoveGcDocumentSchema,
    UpdateGcDocumentSchema,
} from './models';
import { GcService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ generalContractor: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'name', defaultSortOrder: 'asc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const { data, count } = await GcService.getGcs(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/stats', requirePermission({ generalContractor: ['read'] }), async (c) => {
    const stats = await GcService.getStats();
    return success(c, stats);
});

app.get('/:id', requirePermission({ generalContractor: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const gc = await GcService.getGc(id);
    return success(c, gc);
});

app.post(
    '/',
    requirePermission({ generalContractor: ['create'] }),
    zValidator('json', GcCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const gc = await GcService.createGc(data, c.get('user')!.id);
        return success(c, gc, 201);
    }
);

app.put(
    '/',
    requirePermission({ generalContractor: ['update'] }),
    zValidator('json', GcUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const gc = await GcService.updateGc(data, c.get('user')!.id);
        return success(c, gc);
    }
);

app.delete('/:id', requirePermission({ generalContractor: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await GcService.deleteGc(id, c.get('user')!.id);
    return success(c, null);
});

app.patch(
    '/document/add',
    requirePermission({ generalContractor: ['update'] }),
    zValidator('json', AddGcDocumentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertFileAccess(c, data.fileId);
        const document = await GcService.addDocumentToGc(data, c.get('user')!.id);
        return success(c, document);
    }
);

app.patch(
    '/document/update',
    requirePermission({ generalContractor: ['update'] }),
    zValidator('json', UpdateGcDocumentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertFileAccess(c, data.fileId);
        const document = await GcService.updateGcDocument(data, c.get('user')!.id);
        return success(c, document);
    }
);

app.patch(
    '/document/remove',
    requirePermission({ generalContractor: ['update'] }),
    zValidator('json', RemoveGcDocumentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertFileAccess(c, data.fileId);
        await GcService.removeDocumentFromGc(data, c.get('user')!.id);
        return success(c, null);
    }
);

export default app;
