import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    TemplateSettingCreateSchema,
    TemplateSettingListQuerySchema,
    TemplateSettingUpdateSchema,
} from './models';
import { TemplateSettingService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ template: ['read'] }),
    zValidator('query', TemplateSettingListQuerySchema),
    async (c) => {
        const data = await TemplateSettingService.list(c.req.valid('query'));
        return success(c, data);
    }
);

app.get('/:id', requirePermission({ template: ['read'] }), async (c) => {
    const data = await TemplateSettingService.get(c.req.param('id'));
    return success(c, data);
});

app.post(
    '/',
    requirePermission({ template: ['create'] }),
    zValidator('json', TemplateSettingCreateSchema),
    async (c) => {
        const data = await TemplateSettingService.create(c.req.valid('json'), c.get('user')!.id);
        return success(c, data, 201);
    }
);

app.put(
    '/',
    requirePermission({ template: ['update'] }),
    zValidator('json', TemplateSettingUpdateSchema),
    async (c) => {
        const data = await TemplateSettingService.update(c.req.valid('json'), c.get('user')!.id);
        return success(c, data);
    }
);

app.patch('/:id/default', requirePermission({ template: ['set-default'] }), async (c) => {
    const data = await TemplateSettingService.setDefault(c.req.param('id'), c.get('user')!.id);
    return success(c, data);
});

app.delete('/:id', requirePermission({ template: ['delete'] }), async (c) => {
    await TemplateSettingService.remove(c.req.param('id'), c.get('user')!.id);
    return success(c, null);
});

export default app;
