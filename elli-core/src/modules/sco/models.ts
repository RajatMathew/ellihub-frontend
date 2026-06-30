import {
    moneySchema,
    percentSchema,
    quantitySchema,
    rateSchema,
} from '@modules/commercial-document/validation';
import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const SCOLineItemSchema = z.object({
    description: z.string().min(1).optional().nullable(),
    quantity: quantitySchema(),
    unitId: nanoIdSchema,
    unitPrice: rateSchema(),
    costCodeId: nanoIdSchema.optional().nullable(),
});

export type SCOLineItemInput = z.infer<typeof SCOLineItemSchema>;

export const ScoCreateSchema = z.object({
    projectId: nanoIdSchema,
    purchaseOrderId: nanoIdSchema,
    date: z.iso.date(),
    title: z.string().min(1),
    description: z.string().min(1).optional().nullable(),
    negotiatedDiscount: moneySchema('Negotiated discount').optional().nullable(),
    shippingHandlingFee: moneySchema('Shipping and handling fee').optional().nullable(),
    taxPercent: percentSchema('Tax percent').optional().nullable(),
    changeTypeId: nanoIdSchema.optional().nullable(),
    lineItems: z.array(SCOLineItemSchema).min(1, 'At least one line item is required'),
});

export type ScoCreateRequest = z.infer<typeof ScoCreateSchema>;

export const ScoUpdateSchema = ScoCreateSchema.extend({ id: nanoIdSchema });

export type ScoUpdateRequest = z.infer<typeof ScoUpdateSchema>;

export const GenerateScoPdfSchema = z.object({
    addTermsAndConditions: z.boolean().optional().nullable(),
    termsAndConditionsHtml: z.string().max(20000).optional().nullable(),
    addWarningNotice: z.boolean().optional().nullable(),
    warningNoticeTitle: z.string().trim().max(180).optional().nullable(),
    warningNoticeHtml: z.string().max(20000).optional().nullable(),
});

export type GenerateScoPdfRequest = z.infer<typeof GenerateScoPdfSchema>;

export const SetScoApprovedSchema = z.object({
    id: nanoIdSchema,
});

export type SetScoApprovedRequest = z.infer<typeof SetScoApprovedSchema>;

export const SetScoRejectedSchema = z.object({
    id: nanoIdSchema,
    rejectionReason: z.string().min(1),
});

export type SetScoRejectedRequest = z.infer<typeof SetScoRejectedSchema>;

export const SetScoVoidSchema = z.object({
    id: nanoIdSchema,
    voidReason: z.string().min(1),
});

export type SetScoVoidRequest = z.infer<typeof SetScoVoidSchema>;

export const AddScoAttachmentSchema = z.object({
    scoId: nanoIdSchema,
    documentId: nanoIdSchema,
});

export type AddScoAttachmentRequest = z.infer<typeof AddScoAttachmentSchema>;

export const RemoveScoAttachmentSchema = z.object({
    id: nanoIdSchema,
});

export type RemoveScoAttachmentRequest = z.infer<typeof RemoveScoAttachmentSchema>;
