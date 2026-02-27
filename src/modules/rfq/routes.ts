import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import { GeneratePOFromRFQSchema } from '../po/models';
import { POService } from '../po/services';

import addendumChangeTypeRoutes from './addendum-change-type.routes';
import {
    AddendumCreateSchema,
    AwardSchema,
    CancelSchema,
    DeclineSchema,
    DeliverableCreateSchema,
    DeliverableUpdateSchema,
    PublishSchema,
    QuoteCreateSchema,
    QuoteUpdateSchema,
    RFQCreateSchema,
    RFQUpdateSchema,
    VendorInviteSchema,
    VoidAwardSchema,
} from './models';
import quoteStatusRoutes from './quote-status.routes';
import rfqStatusRoutes from './rfq-status.routes';
import { RFQService } from './services';

const app = new Hono();

// Mount lookup table sub-routes
app.route('/statuses', rfqStatusRoutes);
app.route('/quote-statuses', quoteStatusRoutes);
app.route('/addendum-change-types', addendumChangeTypeRoutes);

// --- RFQ CRUD ---

app.get(
    '/',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'desc',
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { projectId, statusId, costCodeId, bidDeadlineAfter, bidDeadlineBefore } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(projectId && { projectId }),
            ...(statusId && { statusId }),
            ...(costCodeId && { costCodeId }),
            ...(bidDeadlineAfter && { bidDeadlineAfter }),
            ...(bidDeadlineBefore && { bidDeadlineBefore }),
        };

        const { data, count } = await RFQService.listRFQs(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.post(
    '/',
    requirePermission({ project: ['create'] }),
    zValidator('json', RFQCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const rfq = await RFQService.createRFQ(data, userId);
        return success(c, rfq, 201);
    }
);

// --- Workflow routes (static paths before :id) ---

app.post(
    '/:id/publish',
    requirePermission({ project: ['update'] }),
    zValidator('json', PublishSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const rfq = await RFQService.publishRFQ(id, data, userId);
        return success(c, rfq);
    }
);

app.post(
    '/:id/cancel',
    requirePermission({ project: ['update'] }),
    zValidator('json', CancelSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const rfq = await RFQService.cancelRFQ(id, data, userId);
        return success(c, rfq);
    }
);

app.post(
    '/:id/award',
    requirePermission({ project: ['update'] }),
    zValidator('json', AwardSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const rfq = await RFQService.awardRFQ(id, data, userId);
        return success(c, rfq);
    }
);

app.post(
    '/:id/void-award',
    requirePermission({ project: ['update'] }),
    zValidator('json', VoidAwardSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const rfq = await RFQService.voidAward(id, data);
        return success(c, rfq);
    }
);

// --- RFQ-to-PO Generation ---

app.post(
    '/:id/generate-po',
    requirePermission({ project: ['create'] }),
    zValidator('json', GeneratePOFromRFQSchema),
    async (c) => {
        const rfqId = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const po = await POService.generatePOFromRFQ(rfqId, data, userId);
        return success(c, po, 201);
    }
);

// --- Bid Comparison (static path before :id) ---

app.get('/:id/bid-comparison', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const comparison = await RFQService.getBidComparison(id);
    return success(c, comparison);
});

// --- Vendor Invitations ---

app.post(
    '/:id/invite-vendors',
    requirePermission({ project: ['update'] }),
    zValidator('json', VendorInviteSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const invites = await RFQService.inviteVendors(id, data, userId);
        return success(c, invites, 201);
    }
);

app.get('/:id/invites', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const invites = await RFQService.listInvites(id);
    return success(c, invites);
});

app.put(
    '/:id/invites/:inviteId/decline',
    requirePermission({ project: ['update'] }),
    zValidator('json', DeclineSchema),
    async (c) => {
        const id = c.req.param('id');
        const inviteId = c.req.param('inviteId');
        const data = c.req.valid('json');
        const invite = await RFQService.declineInvite(id, inviteId, data);
        return success(c, invite);
    }
);

// --- Quotes ---

app.post(
    '/:id/quotes',
    requirePermission({ project: ['update'] }),
    zValidator('json', QuoteCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const quote = await RFQService.createQuote(id, data, userId);
        return success(c, quote, 201);
    }
);

app.put(
    '/:id/quotes/:quoteId',
    requirePermission({ project: ['update'] }),
    zValidator('json', QuoteUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const quoteId = c.req.param('quoteId');
        const data = c.req.valid('json');
        const quote = await RFQService.updateQuote(id, quoteId, data);
        return success(c, quote);
    }
);

app.delete('/:id/quotes/:quoteId', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const quoteId = c.req.param('quoteId');
    await RFQService.deleteQuote(id, quoteId);
    return success(c, null, 200, 'Quote deleted');
});

// --- Deliverables ---

app.post(
    '/:id/deliverables',
    requirePermission({ project: ['update'] }),
    zValidator('json', DeliverableCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const deliverable = await RFQService.addDeliverable(id, data);
        return success(c, deliverable, 201);
    }
);

app.put(
    '/:id/deliverables/:deliverableId',
    requirePermission({ project: ['update'] }),
    zValidator('json', DeliverableUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const deliverableId = c.req.param('deliverableId');
        const data = c.req.valid('json');
        const deliverable = await RFQService.updateDeliverable(id, deliverableId, data);
        return success(c, deliverable);
    }
);

app.delete(
    '/:id/deliverables/:deliverableId',
    requirePermission({ project: ['update'] }),
    async (c) => {
        const id = c.req.param('id');
        const deliverableId = c.req.param('deliverableId');
        await RFQService.removeDeliverable(id, deliverableId);
        return success(c, null, 200, 'Deliverable removed');
    }
);

// --- Addendums ---

app.post(
    '/:id/addendums',
    requirePermission({ project: ['update'] }),
    zValidator('json', AddendumCreateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const addendum = await RFQService.createAddendum(id, data, userId);
        return success(c, addendum, 201);
    }
);

app.get('/:id/addendums', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const addendums = await RFQService.listAddendums(id);
    return success(c, addendums);
});

// --- RFQ Detail (must be after all static sub-routes) ---

app.get('/:id', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const rfq = await RFQService.getRFQ(id);
    return success(c, rfq);
});

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', RFQUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const rfq = await RFQService.updateRFQ(id, data);
        return success(c, rfq);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await RFQService.deleteRFQ(id);
    return success(c, null, 200, 'RFQ deleted');
});

export default app;
