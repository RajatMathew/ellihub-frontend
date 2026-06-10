import { RfqService } from '@modules/rfq/service';
import { BadRequestError } from '@utils';

import { MailSignatureProfileService } from './signature-profile-service';

import type {
    FeatureMailActionRequest,
    FeatureMailDraftRequest,
    FeatureMailDraftResponse,
    FeatureMailKey,
    FeatureMailPdfOptionsRequest,
    FeatureMailQueryRequest,
    FeatureMailSendResponse,
    MailSignatureInput,
} from './models';

type FeatureMailContext = {
    requestedBy: string;
    userId: string;
    signature: MailSignatureInput;
};

type FeatureMailHandler = {
    getDraft: (entityId: string, context: FeatureMailContext) => Promise<FeatureMailDraftResponse>;
    preview: (
        entityId: string,
        draft: FeatureMailDraftRequest,
        context: FeatureMailContext,
        pdfOptions?: FeatureMailPdfOptionsRequest
    ) => Promise<FeatureMailDraftResponse>;
    send: (
        entityId: string,
        draft: FeatureMailDraftRequest,
        context: FeatureMailContext,
        pdfOptions?: FeatureMailPdfOptionsRequest
    ) => Promise<FeatureMailSendResponse>;
};

const featureMailHandlers: Record<FeatureMailKey, FeatureMailHandler> = {
    'rfq.vendorRequest': {
        getDraft: (entityId, context) =>
            RfqService.getVendorEmailDraft(entityId, context.signature),
        preview: (entityId, draft, context) =>
            RfqService.previewVendorEmail(entityId, draft, context.signature),
        send: (entityId, draft, context, pdfOptions) =>
            RfqService.sendVendorEmail(
                entityId,
                draft,
                context.requestedBy,
                context.userId,
                context.signature,
                pdfOptions
            ),
    },
    'rfq.vendorRequestAll': {
        getDraft: (entityId, context) =>
            RfqService.getAllVendorEmailDraft(entityId, context.signature),
        preview: (entityId, draft, context) =>
            RfqService.previewAllVendorEmail(entityId, draft, context.signature),
        send: (entityId, draft, context, pdfOptions) =>
            RfqService.sendAllVendorEmail(
                entityId,
                draft,
                context.requestedBy,
                context.userId,
                context.signature,
                pdfOptions
            ),
    },
};

export const MailFeatureService = {
    getDraft: async (
        request: FeatureMailQueryRequest,
        context: Omit<FeatureMailContext, 'signature'>
    ) => {
        const signature = await MailSignatureProfileService.getSignature(context.userId);
        return getFeatureHandler(request.feature).getDraft(request.entityId, {
            ...context,
            signature,
        });
    },

    preview: async (
        request: FeatureMailActionRequest,
        context: Omit<FeatureMailContext, 'signature'>
    ) => {
        const signature = await MailSignatureProfileService.getSignature(context.userId);
        return getFeatureHandler(request.feature).preview(
            request.entityId,
            {
                ...request.draft,
                signature,
            },
            {
                ...context,
                signature,
            },
            request.pdfOptions
        );
    },

    send: async (
        request: FeatureMailActionRequest,
        context: Omit<FeatureMailContext, 'signature'>
    ) => {
        const signature = await MailSignatureProfileService.getSignature(context.userId);
        return getFeatureHandler(request.feature).send(
            request.entityId,
            {
                ...request.draft,
                signature,
            },
            {
                ...context,
                signature,
            },
            request.pdfOptions
        );
    },
};

function getFeatureHandler(feature: FeatureMailKey) {
    const handler = featureMailHandlers[feature];

    if (!handler) {
        throw new BadRequestError('Unsupported mail feature');
    }

    return handler;
}
