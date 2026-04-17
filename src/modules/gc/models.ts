import z from 'zod';

export const GcStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const PaymentTermsSchema = z.enum([
    'NET_15',
    'NET_30',
    'NET_45',
    'NET_60',
    'NET_90',
    'DUE_ON_RECEIPT',
]);

export const GcCreateSchema = z.object({
    name: z.string().min(2),
    gcTypeId: z.ulid(),
    status: GcStatusSchema.default('ACTIVE'),
    address: z.string().min(1).optional().nullable(),
    email: z.email().optional().nullable(),
    phone: z.string().min(1).optional().nullable(),
    website: z.url().optional().nullable(),
    fax: z.string().min(1).optional().nullable(),
    paymentTerms: PaymentTermsSchema.default('NET_30'),
    retainagePercent: z.number().min(0).max(100).default(10),
});

export type GcCreateRequest = z.infer<typeof GcCreateSchema>;

export const GcUpdateSchema = GcCreateSchema.extend({
    id: z.ulid(),
});

export type GcUpdateRequest = z.infer<typeof GcUpdateSchema>;

export const AddGcDocumentSchema = z.object({
    gcId: z.ulid(),
    fileId: z.ulid(),
    expiresOn: z.iso.date().optional().nullable(),
});

export type AddGcDocumentRequest = z.infer<typeof AddGcDocumentSchema>;

export const UpdateGcDocumentSchema = z.object({
    gcId: z.ulid(),
    fileId: z.ulid(),
    expiresOn: z.iso.date().optional().nullable(),
});

export type UpdateGcDocumentRequest = z.infer<typeof UpdateGcDocumentSchema>;

export const RemoveGcDocumentSchema = z.object({
    gcId: z.ulid(),
    fileId: z.ulid(),
});

export type RemoveGcDocumentRequest = z.infer<typeof RemoveGcDocumentSchema>;
