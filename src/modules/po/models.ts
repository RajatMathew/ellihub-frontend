import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const PaymentTermsSchema = z.enum([
    'NET_15',
    'NET_30',
    'NET_45',
    'NET_60',
    'NET_90',
    'DUE_ON_RECEIPT',
]);

export const POLineItemSchema = z.object({
    rfqDeliverableId: nanoIdSchema.optional().nullable(),
    description: z.string().min(1),
    unitId: nanoIdSchema,
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    costCodeId: nanoIdSchema,
    notes: z.string().min(1).optional().nullable(),
});

export type POLineItemInput = z.infer<typeof POLineItemSchema>;

export const PoCreateSchema = z.object({
    projectId: nanoIdSchema,
    vendorId: nanoIdSchema,
    rfqId: nanoIdSchema.optional().nullable(),
    tradeCategoryId: nanoIdSchema,
    description: z.string().min(1).optional().nullable(),
    leadTime: z.string().min(1).optional().nullable(),
    shipToAddress: z.string().min(1).optional().nullable(),
    address: z.string().min(1).optional().nullable(),
    expectedDate: z.iso.date().optional().nullable(),
    taxPercent: z.number().min(0).max(100).optional().nullable(),
    negotiatedDiscount: z.number().nonnegative().optional().nullable(),
    shippingHandlingFee: z.number().nonnegative().optional().nullable(),
    retainagePercent: z.number().min(0).max(100).optional().nullable(),
    paymentTerms: PaymentTermsSchema,
    notes: z.string().min(1).optional().nullable(),
    lineItems: z.array(POLineItemSchema).min(1, 'At least one line item is required'),
});

export type PoCreateRequest = z.infer<typeof PoCreateSchema>;

export const PoUpdateSchema = PoCreateSchema.extend({ id: nanoIdSchema });

export type PoUpdateRequest = z.infer<typeof PoUpdateSchema>;

export const PoFromRfqLineItemSchema = POLineItemSchema;

export const PoFromRfqSchema = z.object({
    description: z.string().min(1).optional().nullable(),
    leadTime: z.string().min(1).optional().nullable(),
    shipToAddress: z.string().min(1).optional().nullable(),
    address: z.string().min(1).optional().nullable(),
    expectedDate: z.iso.date().optional().nullable(),
    taxPercent: z.number().min(0).max(100).optional().nullable(),
    negotiatedDiscount: z.number().nonnegative().optional().nullable(),
    shippingHandlingFee: z.number().nonnegative().optional().nullable(),
    retainagePercent: z.number().min(0).max(100).optional().nullable(),
    paymentTerms: PaymentTermsSchema.optional().nullable(),
    notes: z.string().min(1).optional().nullable(),
    lineItems: z.array(PoFromRfqLineItemSchema).min(1, 'At least one line item is required'),
});

export type PoFromRfqRequest = z.infer<typeof PoFromRfqSchema>;

export const GeneratePoPdfSchema = z.object({
    addTermsAndConditions: z.boolean().optional().nullable(),
    termsAndConditionsHtml: z.string().max(20000).optional().nullable(),
    addWarningNotice: z.boolean().optional().nullable(),
    warningNoticeTitle: z.string().trim().max(180).optional().nullable(),
    warningNoticeHtml: z.string().max(20000).optional().nullable(),
});

export type GeneratePoPdfRequest = z.infer<typeof GeneratePoPdfSchema>;

export const SetPoIssuedSchema = z.object({
    id: nanoIdSchema,
});

export type SetPoIssuedRequest = z.infer<typeof SetPoIssuedSchema>;

export const SetPoDeliveredSchema = z.object({
    id: nanoIdSchema,
    deliveryDate: z.iso.date(),
});

export type SetPoDeliveredRequest = z.infer<typeof SetPoDeliveredSchema>;

export const SetPoCancelledSchema = z.object({
    id: nanoIdSchema,
    cancellationReason: z.string().min(1),
});

export type SetPoCancelledRequest = z.infer<typeof SetPoCancelledSchema>;

export const AddPoAttachmentSchema = z.object({
    purchaseOrderId: nanoIdSchema,
    documentId: nanoIdSchema,
});

export type AddPoAttachmentRequest = z.infer<typeof AddPoAttachmentSchema>;

export const RemovePoAttachmentSchema = z.object({
    id: nanoIdSchema,
});

export type RemovePoAttachmentRequest = z.infer<typeof RemovePoAttachmentSchema>;
