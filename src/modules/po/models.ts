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
    description: z.string().min(1),
    unitId: z.ulid(),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    costCodeId: z.ulid().optional().nullable(),
    notes: z.string().min(1).optional().nullable(),
});

export type POLineItemInput = z.infer<typeof POLineItemSchema>;

export const PoCreateSchema = z.object({
    projectId: z.ulid(),
    vendorId: z.ulid(),
    rfqId: z.ulid().optional().nullable(),
    tradeCategoryId: z.ulid(),
    description: z.string().min(1).optional().nullable(),
    leadTime: z.string().min(1).optional().nullable(),
    shipToAddress: z.string().min(1).optional().nullable(),
    address: z.string().min(1).optional().nullable(),
    expectedDate: z.iso.date().optional().nullable(),
    taxPercent: z.number().min(0).max(100).optional().nullable(),
    markupAmount: z.number().nonnegative().optional().nullable(),
    retainagePercent: z.number().min(0).max(100).optional().nullable(),
    paymentTerms: PaymentTermsSchema,
    notes: z.string().min(1).optional().nullable(),
    lineItems: z.array(POLineItemSchema).min(1, 'At least one line item is required'),
});

export type PoCreateRequest = z.infer<typeof PoCreateSchema>;
