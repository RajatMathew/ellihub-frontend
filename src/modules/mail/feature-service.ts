import { RfqService } from '@modules/rfq/service';
import { BadRequestError } from '@utils';

import type {
    FeatureMailActionRequest,
    FeatureMailDraftRequest,
    FeatureMailDraftResponse,
    FeatureMailKey,
    FeatureMailQueryRequest,
    FeatureMailSendResponse,
} from './models';

type FeatureMailSendContext = {
    requestedBy: string;
    userId: string;
};

type FeatureMailHandler = {
    getDraft: (entityId: string) => Promise<FeatureMailDraftResponse>;
    preview: (
        entityId: string,
        draft: FeatureMailDraftRequest
    ) => Promise<FeatureMailDraftResponse>;
    send: (
        entityId: string,
        draft: FeatureMailDraftRequest,
        context: FeatureMailSendContext
    ) => Promise<FeatureMailSendResponse>;
};

const featureMailHandlers: Record<FeatureMailKey, FeatureMailHandler> = {
    'rfq.vendorRequest': {
        getDraft: RfqService.getVendorEmailDraft,
        preview: RfqService.previewVendorEmail,
        send: (entityId, draft, context) =>
            RfqService.sendVendorEmail(entityId, draft, context.requestedBy, context.userId),
    },
    'rfq.vendorRequestAll': {
        getDraft: RfqService.getAllVendorEmailDraft,
        preview: RfqService.previewAllVendorEmail,
        send: (entityId, draft, context) =>
            RfqService.sendAllVendorEmail(entityId, draft, context.requestedBy, context.userId),
    },
};

export const MailFeatureService = {
    getDraft: async (request: FeatureMailQueryRequest) => {
        return getFeatureHandler(request.feature).getDraft(request.entityId);
    },

    preview: async (request: FeatureMailActionRequest) => {
        return getFeatureHandler(request.feature).preview(request.entityId, request.draft);
    },

    send: async (request: FeatureMailActionRequest, context: FeatureMailSendContext) => {
        return getFeatureHandler(request.feature).send(request.entityId, request.draft, context);
    },
};

function getFeatureHandler(feature: FeatureMailKey) {
    const handler = featureMailHandlers[feature];

    if (!handler) {
        throw new BadRequestError('Unsupported mail feature');
    }

    return handler;
}
