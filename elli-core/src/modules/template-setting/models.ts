import z from 'zod';

export const TemplateSettingKindSchema = z.enum([
    'PDF_TERMS',
    'PDF_NOTICE',
    'MAIL_FEATURE',
    'MAIL_SENDER_GROUP',
    'MAIL_SIGNATURE',
    'PDF_PROFILE',
]);

export const TemplateSettingStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

const tagSchema = z.string().trim().min(1).max(40);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const PdfTermsTemplateValueSchema = z.object({
    html: z.string().trim().min(1).max(20000),
});

export const PdfNoticeTemplateValueSchema = z.object({
    title: z.string().trim().min(1).max(180),
    bodyHtml: z.string().trim().min(1).max(20000),
});

export const MailSenderGroupTemplateValueSchema = z.object({
    allowed: z.array(emailSchema).min(1).max(25),
    default: emailSchema.optional(),
});

export const MailSignatureImageTemplateSchema = z.object({
    fileName: z.string().trim().min(1).max(160),
    contentId: z.string().trim().min(1).max(80),
    width: z.coerce.number().int().positive().max(800),
    height: z.coerce.number().int().positive().max(800),
    alt: z.string().trim().min(1).max(160),
    line: z.coerce.number().int().min(1).max(4),
});

export const MailSignatureTemplateValueSchema = z.object({
    name: z.string().trim().min(1).max(120),
    role: z.string().trim().min(1).max(160),
    email: emailSchema,
    address: z.string().trim().min(1).max(240),
    phone: z.string().trim().min(1).max(40),
    fax: z.string().trim().max(40).default(''),
    certificationLine: z.string().trim().max(240).default(''),
    images: z.array(MailSignatureImageTemplateSchema).default([]),
});

export const PdfProfileTemplateValueSchema = z.object({
    company: z.object({
        name: z.string().trim().min(1).max(160),
        addressLines: z.array(z.string().trim().min(1).max(160)).min(1).max(5),
        phone: z.string().trim().min(1).max(40),
        logoPath: z.string().trim().max(240).default('assets/logo.png'),
    }),
    shipToName: z.string().trim().max(160).optional(),
});

export const MailFeatureTemplateValueSchema = z.object({
    senderGroup: z.string().trim().min(1).max(80).optional(),
    subject: z.string().trim().min(1).max(240),
    body: z.string().trim().min(1).max(10000),
    pdfProfileKey: z.string().trim().min(1).max(80).optional(),
});

export const TemplateSettingCreateSchema = z.object({
    kind: TemplateSettingKindSchema,
    key: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(500).optional().nullable(),
    value: z.unknown(),
    tags: z.array(tagSchema).max(20).default([]),
    isDefault: z.boolean().default(false),
    status: TemplateSettingStatusSchema.default('ACTIVE'),
});

export const TemplateSettingUpdateSchema = TemplateSettingCreateSchema.partial().extend({
    id: z.string().trim().min(1),
});

export const TemplateSettingListQuerySchema = z.object({
    kind: TemplateSettingKindSchema.optional(),
    key: z.string().trim().min(1).max(120).optional(),
    status: TemplateSettingStatusSchema.optional(),
    includeDeleted: z.coerce.boolean().default(false),
});

export type TemplateSettingKindInput = z.infer<typeof TemplateSettingKindSchema>;
export type TemplateSettingCreateRequest = z.infer<typeof TemplateSettingCreateSchema>;
export type TemplateSettingUpdateRequest = z.infer<typeof TemplateSettingUpdateSchema>;
export type TemplateSettingListQuery = z.infer<typeof TemplateSettingListQuerySchema>;
export type PdfTermsTemplateValue = z.infer<typeof PdfTermsTemplateValueSchema>;
export type PdfNoticeTemplateValue = z.infer<typeof PdfNoticeTemplateValueSchema>;
export type MailSenderGroupTemplateValue = z.infer<typeof MailSenderGroupTemplateValueSchema>;
export type MailSignatureTemplateValue = z.infer<typeof MailSignatureTemplateValueSchema>;
export type PdfProfileTemplateValue = z.infer<typeof PdfProfileTemplateValueSchema>;
export type MailFeatureTemplateValue = z.infer<typeof MailFeatureTemplateValueSchema>;
