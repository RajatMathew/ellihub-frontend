import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddEmailToContactSchema,
    AddPhoneToContactSchema,
    AddTagToContactSchema,
    ContactCreateSchema,
    ContactUpdateSchema,
    RemoveEmailFromContactSchema,
    RemovePhoneFromContactSchema,
    RemoveTagFromContactSchema,
} from './models';
import { ContactService } from './service';

const app = new Hono();

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

app.post(
    '/',
    requirePermission({ contact: ['create'] }),
    zValidator('json', ContactCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.createContact(data, c.get('user')!.id);
        return success(c, contact, 201);
    }
);

app.put(
    '/',
    requirePermission({ contact: ['update'] }),
    zValidator('json', ContactUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.updateContact(data, c.get('user')!.id);
        return success(c, contact);
    }
);

app.delete('/:id', requirePermission({ contact: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await ContactService.deleteContact(id, c.get('user')!.id);
    return success(c, null);
});

app.patch(
    '/email/add',
    requirePermission({ contact: ['update'] }),
    zValidator('json', AddEmailToContactSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.addEmailToContact(data, c.get('user')!.id);
        return success(c, contact);
    }
);

app.patch(
    '/email/remove',
    requirePermission({ contact: ['update'] }),
    zValidator('json', RemoveEmailFromContactSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.removeEmailFromContact(data, c.get('user')!.id);
        return success(c, contact);
    }
);

app.patch(
    '/phone/add',
    requirePermission({ contact: ['update'] }),
    zValidator('json', AddPhoneToContactSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.addPhoneToContact(data, c.get('user')!.id);
        return success(c, contact);
    }
);

app.patch(
    '/phone/remove',
    requirePermission({ contact: ['update'] }),
    zValidator('json', RemovePhoneFromContactSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.removePhoneFromContact(data, c.get('user')!.id);
        return success(c, contact);
    }
);

app.patch(
    '/tag/add',
    requirePermission({ contact: ['update'] }),
    zValidator('json', AddTagToContactSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.addTagToContact(data, c.get('user')!.id);
        return success(c, contact);
    }
);

app.patch(
    '/tag/remove',
    requirePermission({ contact: ['update'] }),
    zValidator('json', RemoveTagFromContactSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.removeTagFromContact(data, c.get('user')!.id);
        return success(c, contact);
    }
);

export default app;
