import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    ContactCreateSchema,
    ContactEntityTypeCreateSchema,
    ContactEntityTypeUpdateSchema,
    ContactUpdateSchema,
    ProfessionalRoleCreateSchema,
    ProfessionalRoleUpdateSchema,
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

// ContactEntityType Routes (must be before /:id to avoid catch-all match)
app.get('/entity-types', requirePermission({ contactEntityType: ['read'] }), async (c) => {
    const types = await ContactService.getContactEntityTypes();
    return success(c, types);
});

app.post(
    '/entity-types',
    requirePermission({ contactEntityType: ['create'] }),
    zValidator('json', ContactEntityTypeCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const entityType = await ContactService.createContactEntityType(data);
        return success(c, entityType, 201);
    }
);

app.put(
    '/entity-types/:id',
    requirePermission({ contactEntityType: ['update'] }),
    zValidator('json', ContactEntityTypeUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const entityType = await ContactService.updateContactEntityType(id, data);
        return success(c, entityType);
    }
);

app.delete(
    '/entity-types/:id',
    requirePermission({ contactEntityType: ['delete'] }),
    async (c) => {
        const id = c.req.param('id');
        await ContactService.deleteContactEntityType(id);
        return success(c, null);
    }
);

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

export default app;
