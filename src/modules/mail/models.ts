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

export const FeatureMailDraftSchema = z.object({
    from: EmailAddressSchema,
    to: z.array(EmailAddressSchema).min(1),
    cc: z.array(EmailAddressSchema).default([]),
    bcc: z.array(EmailAddressSchema).default([]),
    subject: z.string().trim().min(1),
    body: z.string().trim().min(1),
    signature: MailSignatureSchema,
    saveToSentItems: z.boolean().default(true),
});

export type FeatureMailDraftRequest = z.infer<typeof FeatureMailDraftSchema>;

export type FeatureMailAttachmentPreview = {
    name: string;
    contentType: string;
    source?: string;
};

export type FeatureMailSignatureAsset = {
    fileName: string;
    contentType: string;
    contentId: string;
};

export type FeatureMailDraftResponse = FeatureMailDraftRequest & {
    senderOptions: string[];
    html: string;
    attachments: FeatureMailAttachmentPreview[];
    signatureAssets: FeatureMailSignatureAsset[];
};

export type FeatureMailSendResponse = FeatureMailDraftResponse & {
    sentAt: string;
};

export const FeatureMailKeySchema = z.enum(['rfq.vendorRequest', 'rfq.vendorRequestAll']);

export type FeatureMailKey = z.infer<typeof FeatureMailKeySchema>;

export const FeatureMailQuerySchema = z.object({
    feature: FeatureMailKeySchema,
    entityId: z.ulid(),
});

export type FeatureMailQueryRequest = z.infer<typeof FeatureMailQuerySchema>;

export const FeatureMailActionSchema = z.object({
    feature: FeatureMailKeySchema,
    entityId: z.ulid(),
    draft: FeatureMailDraftSchema,
});

export type FeatureMailActionRequest = z.infer<typeof FeatureMailActionSchema>;
