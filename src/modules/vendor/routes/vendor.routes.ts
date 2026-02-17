import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    VendorContactAddSchema,
    VendorContactUpdateSchema,
    VendorCreateSchema,
    VendorUpdateSchema,
} from '../models/vendor.models';
import { VendorService } from '../services/vendor.services';

const app = new Hono();

// Create vendor
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

// List vendors (paginated)
app.get(
    '/',
    requirePermission({ vendor: ['read'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'name',
        defaultSortOrder: 'asc',
        allowedSortFields: ['name', 'type', 'status', 'createdAt', 'updatedAt'],
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { type, status, categoryTag } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(type && { type }),
            ...(status && { status }),
            ...(categoryTag && { categoryTag }),
        };

        const { data, count } = await VendorService.getVendors(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

// Get single vendor
app.get('/:id', requirePermission({ vendor: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const vendor = await VendorService.getVendor(id);
    return success(c, vendor);
});

// Update vendor
app.put(
    '/:id',
    requirePermission({ vendor: ['update'] }),
    zValidator('json', VendorUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const vendor = await VendorService.updateVendor(id, data);
        return success(c, vendor);
    }
);

// Delete vendor (sets status to INACTIVE)
app.delete('/:id', requirePermission({ vendor: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await VendorService.deleteVendor(id);
    return success(c, null);
});

// Add contact to vendor
app.post(
    '/:id/contacts',
    requirePermission({ vendor: ['update'] }),
    zValidator('json', VendorContactAddSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const link = await VendorService.addContact(id, data);
        return success(c, link, 201);
    }
);

// Update contact link (isPrimary)
app.put(
    '/:id/contacts/:contactId',
    requirePermission({ vendor: ['update'] }),
    zValidator('json', VendorContactUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const contactId = c.req.param('contactId');
        const data = c.req.valid('json');
        const link = await VendorService.updateContact(id, contactId, data);
        return success(c, link);
    }
);

// Remove contact from vendor
app.delete(
    '/:id/contacts/:contactId',
    requirePermission({ vendor: ['update'] }),
    async (c) => {
        const id = c.req.param('id');
        const contactId = c.req.param('contactId');
        await VendorService.removeContact(id, contactId);
        return success(c, null);
    }
);

export default app;
