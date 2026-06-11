import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const RfqStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'AWARDED', 'VOID']);

export const RfqDeliverableSchema = z.object({
    name: z.string().min(1),
    unitId: nanoIdSchema,
    quantity: z.number().positive(),
    costCodeId: nanoIdSchema.optional().nullable(),
});

export type RfqDeliverableInput = z.infer<typeof RfqDeliverableSchema>;

export const RfqCreateSchema = z.object({
    projectId: nanoIdSchema,
    title: z.string().min(1),
    description: z.string().min(1).optional().nullable(),
    bidDeadline: z.iso.date(),
    typeId: nanoIdSchema,
    deliverables: z.array(RfqDeliverableSchema).min(1, 'At least one deliverable is required'),
});

export type RfqCreateRequest = z.infer<typeof RfqCreateSchema>;

export const RfqUpdateSchema = z.object({
    id: nanoIdSchema,
    title: z.string().min(1),
    description: z.string().min(1).optional().nullable(),
    bidDeadline: z.iso.date(),
    typeId: nanoIdSchema,
    deliverables: z.array(RfqDeliverableSchema).min(1, 'At least one deliverable is required'),
});

export type RfqUpdateRequest = z.infer<typeof RfqUpdateSchema>;

export const AddRfqAttachmentSchema = z.object({
    rfqId: nanoIdSchema,
    documentId: nanoIdSchema,
});

export type AddRfqAttachmentRequest = z.infer<typeof AddRfqAttachmentSchema>;

export const RemoveRfqAttachmentSchema = z.object({
    id: nanoIdSchema,
});

export type RemoveRfqAttachmentRequest = z.infer<typeof RemoveRfqAttachmentSchema>;

export const AddVendorSchema = z.object({
    rfqId: nanoIdSchema,
    vendorId: nanoIdSchema,
});

export type AddVendorRequest = z.infer<typeof AddVendorSchema>;

export const RemoveVendorSchema = z.object({
    id: nanoIdSchema,
});

export type RemoveVendorRequest = z.infer<typeof RemoveVendorSchema>;

const RfqVendorPdfCompanySchema = z.object({
    name: z.string().trim().min(1).max(160),
    addressLines: z.array(z.string().trim().min(1).max(160)).min(1).max(5),
    phone: z.string().trim().min(1).max(40),
    logoPath: z.string().trim().max(240).default('assets/logo.png'),
});

export const GenerateVendorPdfSchema = z.object({
    company: RfqVendorPdfCompanySchema.optional(),
    shipToName: z.string().trim().min(1).max(160).optional(),
    addTermsAndConditions: z.boolean().optional().nullable(),
    termsAndConditionsHtml: z.string().max(20000).optional().nullable(),
    addWarningNotice: z.boolean().optional().nullable(),
    warningNoticeTitle: z.string().trim().max(180).optional().nullable(),
    warningNoticeHtml: z.string().max(20000).optional().nullable(),
});

export type GenerateVendorPdfRequest = z.infer<typeof GenerateVendorPdfSchema>;

export const SubmitQuoteSchema = z.object({
    id: nanoIdSchema,
    quotedAmount: z.number().nonnegative(),
    leadTime: z.string().min(1).optional().nullable(),
    attachments: z.array(nanoIdSchema).min(1, 'At least one attachment is required'),
});

export type SubmitQuoteRequest = z.infer<typeof SubmitQuoteSchema>;

export const EditQuoteSchema = SubmitQuoteSchema.extend({
    attachments: z.array(nanoIdSchema).default([]),
});

export type EditQuoteRequest = z.infer<typeof EditQuoteSchema>;

export const RemoveQuoteSchema = z.object({
    id: nanoIdSchema,
});

export type RemoveQuoteRequest = z.infer<typeof RemoveQuoteSchema>;

export const DeclineQuoteSchema = z.object({
    id: nanoIdSchema,
    declineReason: z.string().min(1).optional().nullable(),
});

export type DeclineQuoteRequest = z.infer<typeof DeclineQuoteSchema>;

export const VoidRfqSchema = z.object({
    id: nanoIdSchema,
    cancellationReason: z.string().min(1),
});

export type VoidRfqRequest = z.infer<typeof VoidRfqSchema>;

export const AwardRfqSchema = z.object({
    quoteId: nanoIdSchema,
});

export type AwardRfqRequest = z.infer<typeof AwardRfqSchema>;

export const UnawardRfqSchema = z.object({
    id: nanoIdSchema,
});

export type UnawardRfqRequest = z.infer<typeof UnawardRfqSchema>;

export const VoidAwardSchema = z.object({
    voidReason: z.string().min(1),
});

export type VoidAwardRequest = z.infer<typeof VoidAwardSchema>;
