import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    GCContactAddSchema,
    GCContactUpdateSchema,
    GCCreateSchema,
    GCUpdateSchema,
} from '../models/gc.models';
import { GeneralContractorService } from '../services/gc.services';

import gcTypeRoutes from './gc-type.routes';

const app = new Hono();

// Mount GC Type routes
app.route('/types', gcTypeRoutes);

// Stats (before /:id to avoid catch-all)
app.get('/stats', requirePermission({ generalContractor: ['read'] }), async (c) => {
    const stats = await GeneralContractorService.getStats();
    return success(c, stats);
});

// GC CRUD
app.post(
    '/',
    requirePermission({ generalContractor: ['create'] }),
    zValidator('json', GCCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const gc = await GeneralContractorService.createGC(data);
        return success(c, gc, 201);
    }
);

app.get(
    '/',
    requirePermission({ generalContractor: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'name', defaultSortOrder: 'asc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { status, gcTypeId } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(status && { status }),
            ...(gcTypeId && { gcTypeId }),
        };

        const { data, count } = await GeneralContractorService.getGCs(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', requirePermission({ generalContractor: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const gc = await GeneralContractorService.getGC(id);
    return success(c, gc);
});

app.put(
    '/:id',
    requirePermission({ generalContractor: ['update'] }),
    zValidator('json', GCUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const gc = await GeneralContractorService.updateGC(id, data);
        return success(c, gc);
    }
);

app.delete('/:id', requirePermission({ generalContractor: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    const gc = await GeneralContractorService.deleteGC(id);
    return success(c, gc);
});

// Contact sub-resource
app.post(
    '/:id/contacts',
    requirePermission({ generalContractor: ['update'] }),
    zValidator('json', GCContactAddSchema),
    async (c) => {
        const gcId = c.req.param('id');
        const data = c.req.valid('json');
        const link = await GeneralContractorService.addContact(gcId, data);
        return success(c, link, 201);
    }
);

app.put(
    '/:id/contacts/:contactId',
    requirePermission({ generalContractor: ['update'] }),
    zValidator('json', GCContactUpdateSchema),
    async (c) => {
        const gcId = c.req.param('id');
        const contactId = c.req.param('contactId');
        const data = c.req.valid('json');
        const link = await GeneralContractorService.updateContact(gcId, contactId, data);
        return success(c, link);
    }
);

app.delete(
    '/:id/contacts/:contactId',
    requirePermission({ generalContractor: ['update'] }),
    async (c) => {
        const gcId = c.req.param('id');
        const contactId = c.req.param('contactId');
        await GeneralContractorService.removeContact(gcId, contactId);
        return success(c, null);
    }
);

export default app;
