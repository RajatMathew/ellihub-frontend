import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    ContactCreateSchema,
    ContactUpdateSchema,
    EmailAddSchema,
    GCLinkCreateSchema,
    PhoneAddSchema,
    ProfessionalRoleCreateSchema,
    ProfessionalRoleUpdateSchema,
    VendorLinkCreateSchema,
} from './models';
import { ContactService } from './services';

const app = new Hono();

// ProfessionalRole Routes (must be before /:id to avoid catch-all match)
app.get('/professional-roles', requirePermission({ professionalRole: ['read'] }), async (c) => {
    const roles = await ContactService.getProfessionalRoles();
    return success(c, roles);
});

app.post(
    '/professional-roles',
    requirePermission({ professionalRole: ['create'] }),
    zValidator('json', ProfessionalRoleCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const role = await ContactService.createProfessionalRole(data);
        return success(c, role, 201);
    }
);

app.put(
    '/professional-roles/:id',
    requirePermission({ professionalRole: ['update'] }),
    zValidator('json', ProfessionalRoleUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const role = await ContactService.updateProfessionalRole(id, data);
        return success(c, role);
    }
);

app.delete(
    '/professional-roles/:id',
    requirePermission({ professionalRole: ['delete'] }),
    async (c) => {
        const id = c.req.param('id');
        await ContactService.deleteProfessionalRole(id);
        return success(c, null);
    }
);

// Directory KPIs (must be before /:id to avoid catch-all match)
app.get('/directory-kpis', requirePermission({ contact: ['read'] }), async (c) => {
    const kpis = await ContactService.getDirectoryKpis();
    return success(c, kpis);
});

// Contact Routes
app.post(
    '/',
    requirePermission({ contact: ['create'] }),
    zValidator('json', ContactCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.createContact(data);
        return success(c, contact, 201);
    }
);

app.get(
    '/',
    requirePermission({ contact: ['read'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'fullName', defaultSortOrder: 'asc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        // Merge top-level query params into filter
        const { professionalRoleId, vendorId, generalContractorId } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(professionalRoleId && { professionalRoleId }),
            ...(vendorId && { vendorId }),
            ...(generalContractorId && { generalContractorId }),
        };

        const { data, count } = await ContactService.getContacts(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', requirePermission({ contact: ['read'] }), async (c) => {
    const id = c.req.param('id');
    const contact = await ContactService.getContact(id);
    return success(c, contact);
});

app.put(
    '/:id',
    requirePermission({ contact: ['update'] }),
    zValidator('json', ContactUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const contact = await ContactService.updateContact(id, data);
        return success(c, contact);
    }
);

app.delete('/:id', requirePermission({ contact: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await ContactService.deleteContact(id);
    return success(c, null);
});

// Phone sub-resource
app.post(
    '/:id/phones',
    requirePermission({ contact: ['update'] }),
    zValidator('json', PhoneAddSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const contact = await ContactService.addPhone(id, data);
        return success(c, contact, 201);
    }
);

app.delete('/:id/phones', requirePermission({ contact: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const contact = await ContactService.removePhone(id);
    return success(c, contact);
});

// Email sub-resource
app.post(
    '/:id/emails',
    requirePermission({ contact: ['update'] }),
    zValidator('json', EmailAddSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const contact = await ContactService.addEmail(id, data);
        return success(c, contact, 201);
    }
);

app.delete('/:id/emails', requirePermission({ contact: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const contact = await ContactService.removeEmail(id);
    return success(c, contact);
});

// Vendor link sub-resource
app.post(
    '/:id/vendor-links',
    requirePermission({ contact: ['update'] }),
    zValidator('json', VendorLinkCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const link = await ContactService.addVendorLink(id, data);
        return success(c, link, 201);
    }
);

app.delete('/:id/vendor-links/:linkId', requirePermission({ contact: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const linkId = c.req.param('linkId');
    await ContactService.removeVendorLink(id, linkId);
    return success(c, null);
});

// GC link sub-resource
app.post(
    '/:id/gc-links',
    requirePermission({ contact: ['update'] }),
    zValidator('json', GCLinkCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const link = await ContactService.addGCLink(id, data);
        return success(c, link, 201);
    }
);

app.delete('/:id/gc-links/:linkId', requirePermission({ contact: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const linkId = c.req.param('linkId');
    await ContactService.removeGCLink(id, linkId);
    return success(c, null);
});

export default app;
