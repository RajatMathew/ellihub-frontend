import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requireAnyPermission, requirePermission } from 'src/middleware/auth';

import { PdfNoticeSettingsUpdateSchema, PdfTermsSettingsUpdateSchema } from './models';
import { PdfNoticeService } from './notice-service';
import { PdfTermsService } from './terms-service';

const app = new Hono();

app.get(
    '/terms/:section',
    requireAnyPermission([
        { purchaseOrder: ['read'] },
        { rfq: ['read'] },
        { subChangeOrder: ['read'] },
        { template: ['read'] },
    ]),
    async (c) => {
        const data = await PdfTermsService.getConfig(c.req.param('section'));
        return success(c, data);
    }
);

app.put(
    '/terms/:section/settings',
    requirePermission({ template: ['update'] }),
    zValidator('json', PdfTermsSettingsUpdateSchema),
    async (c) => {
        const data = await PdfTermsService.updateSettings(
            c.req.param('section'),
            c.req.valid('json'),
            c.get('user')!.id
        );
        return success(c, data);
    }
);

app.get(
    '/notices/:section',
    requireAnyPermission([
        { purchaseOrder: ['read'] },
        { rfq: ['read'] },
        { subChangeOrder: ['read'] },
        { template: ['read'] },
    ]),
    async (c) => {
        const data = await PdfNoticeService.getConfig(c.req.param('section'));
        return success(c, data);
    }
);

app.put(
    '/notices/:section/settings',
    requirePermission({ template: ['update'] }),
    zValidator('json', PdfNoticeSettingsUpdateSchema),
    async (c) => {
        const data = await PdfNoticeService.updateSettings(
            c.req.param('section'),
            c.req.valid('json'),
            c.get('user')!.id
        );
        return success(c, data);
    }
);

export default app;
