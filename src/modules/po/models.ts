import {
    moneySchema,
    percentSchema,
    quantitySchema,
    rateSchema,
} from '@modules/commercial-document/validation';
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

export const PoNumberModeSchema = z.enum(['AUTO', 'MANUAL']);

const OptionalPoNumberSuffixSchema = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z
        .string()
        .trim()
        .max(32, 'PO number is too long')
        .regex(/^(?:PO-)?\d+$/i, 'PO number must be numeric')
        .optional()
        .nullable()
);

const RequiredPoNumberSuffixSchema = z
    .string()
    .trim()
    .min(1, 'PO number is required')
    .max(32, 'PO number is too long')
    .regex(/^(?:PO-)?\d+$/i, 'PO number must be numeric');

function validatePoNumberConfig(
    value: { poNumberMode?: 'AUTO' | 'MANUAL'; poNumberSuffix?: string | null },
    ctx: z.RefinementCtx
) {
    if (value.poNumberMode !== 'MANUAL') return;

    if (!value.poNumberSuffix?.trim()) {
        ctx.addIssue({
            code: 'custom',
            path: ['poNumberSuffix'],
            message: 'Manual PO number is required',
        });
    }
}

export const POLineItemSchema = z.object({
    rfqDeliverableId: nanoIdSchema.optional().nullable(),
    description: z.string().min(1),
    unitId: nanoIdSchema,
    quantity: quantitySchema(),
    unitPrice: rateSchema(),
    costCodeId: nanoIdSchema,
    notes: z.string().min(1).optional().nullable(),
});

export type POLineItemInput = z.infer<typeof POLineItemSchema>;

const PoBaseSchema = z.object({
    projectId: nanoIdSchema,
    vendorId: nanoIdSchema,
    rfqId: nanoIdSchema.optional().nullable(),
    poNumberMode: PoNumberModeSchema.optional(),
    poNumberSuffix: OptionalPoNumberSuffixSchema,
    tradeCategoryId: nanoIdSchema,
    description: z.string().min(1).optional().nullable(),
    leadTime: z.string().min(1).optional().nullable(),
    shipToAddress: z.string().min(1).optional().nullable(),
    address: z.string().min(1).optional().nullable(),
    expectedDate: z.iso.date().optional().nullable(),
    taxPercent: percentSchema('Tax percent').optional().nullable(),
    negotiatedDiscount: moneySchema('Negotiated discount').optional().nullable(),
    shippingHandlingFee: moneySchema('Shipping and handling fee').optional().nullable(),
    retainagePercent: percentSchema('Retainage percent').optional().nullable(),
    paymentTerms: PaymentTermsSchema,
    notes: z.string().min(1).optional().nullable(),
    lineItems: z.array(POLineItemSchema).min(1, 'At least one line item is required'),
});

export const PoCreateSchema = PoBaseSchema.superRefine(validatePoNumberConfig);

export type PoCreateRequest = z.infer<typeof PoCreateSchema>;

export const PoUpdateSchema = PoBaseSchema.extend({ id: nanoIdSchema }).superRefine(
    validatePoNumberConfig
);

export type PoUpdateRequest = z.infer<typeof PoUpdateSchema>;

export const PoNumberAvailabilityQuerySchema = z.object({
    poNumberSuffix: RequiredPoNumberSuffixSchema,
    excludeId: nanoIdSchema.optional(),
});

export type PoNumberAvailabilityQueryRequest = z.infer<typeof PoNumberAvailabilityQuerySchema>;

export const PoFromRfqLineItemSchema = POLineItemSchema;

export const PoFromRfqSchema = z
    .object({
        poNumberMode: PoNumberModeSchema.optional(),
        poNumberSuffix: OptionalPoNumberSuffixSchema,
        description: z.string().min(1).optional().nullable(),
        leadTime: z.string().min(1).optional().nullable(),
        shipToAddress: z.string().min(1).optional().nullable(),
        address: z.string().min(1).optional().nullable(),
        expectedDate: z.iso.date().optional().nullable(),
        taxPercent: percentSchema('Tax percent').optional().nullable(),
        negotiatedDiscount: moneySchema('Negotiated discount').optional().nullable(),
        shippingHandlingFee: moneySchema('Shipping and handling fee').optional().nullable(),
        retainagePercent: percentSchema('Retainage percent').optional().nullable(),
        paymentTerms: PaymentTermsSchema.optional().nullable(),
        notes: z.string().min(1).optional().nullable(),
        lineItems: z.array(PoFromRfqLineItemSchema).min(1, 'At least one line item is required'),
    })
    .superRefine(validatePoNumberConfig);

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
