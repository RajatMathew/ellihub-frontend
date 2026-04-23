import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddTagToContactSchema,
    ContactCreateSchema,
    ContactUpdateSchema,
    LinkContactSchema,
    RemoveTagFromContactSchema,
    UnlinkContactSchema,
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

app.get('/search', requirePermission({ contact: ['read'] }), async (c) => {
    const search = c.req.query('search');
    const contacts = await ContactService.searchUnlinkedContacts(search);
    return success(c, contacts);
});

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

app.patch(
    '/link',
    requirePermission({ contact: ['update'] }),
    zValidator('json', LinkContactSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.linkContact(data, c.get('user')!.id);
        return success(c, contact);
    }
);

app.patch(
    '/unlink',
    requirePermission({ contact: ['update'] }),
    zValidator('json', UnlinkContactSchema),
    async (c) => {
        const data = c.req.valid('json');
        const contact = await ContactService.unlinkContact(data, c.get('user')!.id);
        return success(c, contact);
    }
);

export default app;
