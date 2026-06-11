import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const EmailAddressSchema = z.string().trim().toLowerCase().pipe(z.email());

export const MailAttachmentSchema = z.object({
    name: z.string().trim().min(1),
    contentType: z.string().trim().min(1).default('application/octet-stream'),
    contentBytes: z.string().trim().min(1),
    isInline: z.boolean().optional(),
    contentId: z.string().trim().min(1).optional(),
});

export type MailAttachmentInput = z.infer<typeof MailAttachmentSchema>;

export const MailSendSchema = z.object({
    from: EmailAddressSchema,
    to: z.array(EmailAddressSchema).min(1),
    cc: z.array(EmailAddressSchema).default([]),
    bcc: z.array(EmailAddressSchema).default([]),
    subject: z.string().trim().min(1),
    html: z.string().trim().min(1),
    attachments: z.array(MailAttachmentSchema).default([]),
    saveToSentItems: z.boolean().default(true),
});

export type MailSendRequest = z.infer<typeof MailSendSchema>;

export const MailSignatureSchema = z.object({
    name: z.string().trim().min(1).max(120),
    role: z.string().trim().min(1).max(160),
    email: EmailAddressSchema,
});

export type MailSignatureInput = z.infer<typeof MailSignatureSchema>;

export const FeatureMailDraftBaseSchema = z.object({
    from: EmailAddressSchema,
    to: z.array(EmailAddressSchema).default([]),
    cc: z.array(EmailAddressSchema).default([]),
    bcc: z.array(EmailAddressSchema).default([]),
    subject: z.string().trim().min(1),
    body: z.string().trim().min(1),
    signature: MailSignatureSchema,
    attachmentIds: z.array(z.string().trim().min(1)).default([]),
    saveToSentItems: z.boolean().default(true),
});

export type FeatureMailDraftBase = z.infer<typeof FeatureMailDraftBaseSchema>;

export const FeatureMailDraftSchema = FeatureMailDraftBaseSchema.extend({
    to: z.array(EmailAddressSchema).min(1),
});

export type FeatureMailDraftRequest = z.infer<typeof FeatureMailDraftSchema>;

export const FeatureMailPdfOptionsSchema = z.object({
    addTermsAndConditions: z.boolean().optional().nullable(),
    termsAndConditionsHtml: z.string().max(20000).optional().nullable(),
    addWarningNotice: z.boolean().optional().nullable(),
    warningNoticeTitle: z.string().trim().max(180).optional().nullable(),
    warningNoticeHtml: z.string().max(20000).optional().nullable(),
});

export type FeatureMailPdfOptionsRequest = z.infer<typeof FeatureMailPdfOptionsSchema>;

export type FeatureMailAttachmentPreview = {
    id: string;
    name: string;
    contentType: string;
    source?: string;
};

export type FeatureMailSignatureAsset = {
    fileName: string;
    contentType: string;
    contentId: string;
};

export type FeatureMailRecipientOption = {
    id: string;
    type: 'vendor' | 'contact';
    label: string;
    email: string;
    isPrimary?: boolean;
};

export type FeatureMailRecipientGroup = {
    id: string;
    label: string;
    entityType: 'vendor';
    entityId: string;
    quoteId?: string;
    missingEntityEmail?: boolean;
    options: FeatureMailRecipientOption[];
};

export type FeatureMailDraftResponse = FeatureMailDraftBase & {
    senderOptions: string[];
    html: string;
    attachments: FeatureMailAttachmentPreview[];
    signatureAssets: FeatureMailSignatureAsset[];
    recipientGroups?: FeatureMailRecipientGroup[];
};

export type FeatureMailSendResponse = FeatureMailDraftResponse & {
    sentAt: string;
};

export const FeatureMailKeySchema = z.enum(['rfq.vendorRequest', 'rfq.vendorRequestAll']);

export type FeatureMailKey = z.infer<typeof FeatureMailKeySchema>;

export const FeatureMailQuerySchema = z.object({
    feature: FeatureMailKeySchema,
    entityId: nanoIdSchema,
});

export type FeatureMailQueryRequest = z.infer<typeof FeatureMailQuerySchema>;

export const FeatureMailActionSchema = z.object({
    feature: FeatureMailKeySchema,
    entityId: nanoIdSchema,
    draft: FeatureMailDraftSchema,
    pdfOptions: FeatureMailPdfOptionsSchema.optional(),
});

export type FeatureMailActionRequest = z.infer<typeof FeatureMailActionSchema>;
