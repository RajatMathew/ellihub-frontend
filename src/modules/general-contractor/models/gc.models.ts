import z from 'zod';

const GCStatusEnum = z.enum(['ACTIVE', 'PROSPECTING', 'INACTIVE', 'BLACKLISTED']);

const PaymentTermsEnum = z.enum([
    'NET_15',
    'NET_30',
    'NET_45',
    'NET_60',
    'NET_90',
    'DUE_ON_RECEIPT',
]);

const NestedContactSchema = z.object({
    contactId: z.string().min(1),
    isPrimary: z.boolean().optional().default(false),
});

export const GCCreateSchema = z.object({
    name: z.string().min(1),
    gcTypeId: z.string().min(1),
    status: GCStatusEnum.optional(),
    address: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().url().optional(),
    paymentTerms: PaymentTermsEnum.optional(),
    retainagePercent: z.number().min(0).max(100).optional(),
    contacts: z.array(NestedContactSchema).optional().default([]),
});

export type GCCreateRequest = z.infer<typeof GCCreateSchema>;

export const GCUpdateSchema = z
    .object({
        name: z.string().min(1),
        gcTypeId: z.string().min(1),
        status: GCStatusEnum,
        address: z.string().nullable(),
        email: z.string().email().nullable(),
        phone: z.string().nullable(),
        website: z.string().url().nullable(),
        paymentTerms: PaymentTermsEnum,
        retainagePercent: z.number().min(0).max(100),
    })
    .partial();

export type GCUpdateRequest = z.infer<typeof GCUpdateSchema>;

export const GCContactAddSchema = z.object({
    contactId: z.string().min(1),
    isPrimary: z.boolean().optional().default(false),
});

export type GCContactAddRequest = z.infer<typeof GCContactAddSchema>;

export const GCContactUpdateSchema = z.object({
    isPrimary: z.boolean(),
});

export type GCContactUpdateRequest = z.infer<typeof GCContactUpdateSchema>;
