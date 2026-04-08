import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddVendorDocumentSchema,
    RemoveVendorDocumentSchema,
    UpdateVendorDocumentSchema,
    VendorCreateSchema,
    VendorUpdateSchema,
} from './models';
import { VendorService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ vendor: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'name', defaultSortOrder: 'asc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const { data, count } = await VendorService.getVendors(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', requirePermission({ vendor: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const vendor = await VendorService.getVendor(id);
    return success(c, vendor);
});

app.post(
    '/',
    requirePermission({ vendor: ['create'] }),
    zValidator('json', VendorCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const vendor = await VendorService.createVendor(data);
        return success(c, vendor, 201);
    }
);

app.put(
    '/',
    requirePermission({ vendor: ['update'] }),
    zValidator('json', VendorUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const vendor = await VendorService.updateVendor(data);
        return success(c, vendor);
    }
);

app.delete('/:id', requirePermission({ vendor: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await VendorService.deleteVendor(id);
    return success(c, null);
});

app.patch(
    '/document/add',
    requirePermission({ vendor: ['update'] }),
    zValidator('json', AddVendorDocumentSchema),
    async (c) => {
        const data = c.req.valid('json');
        const document = await VendorService.addDocumentToVendor(data);
        return success(c, document);
    }
);

app.patch(
    '/document/update',
    requirePermission({ vendor: ['update'] }),
    zValidator('json', UpdateVendorDocumentSchema),
    async (c) => {
        const data = c.req.valid('json');
        const document = await VendorService.updateVendorDocument(data);
        return success(c, document);
    }
);

app.patch(
    '/document/remove',
    requirePermission({ vendor: ['update'] }),
    zValidator('json', RemoveVendorDocumentSchema),
    async (c) => {
        const data = c.req.valid('json');
        await VendorService.removeDocumentFromVendor(data);
        return success(c, null);
    }
);

export default app;
