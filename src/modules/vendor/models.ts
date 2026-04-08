import z from 'zod';

export const VendorStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export const PaymentTermsSchema = z.enum([
    'NET_15',
    'NET_30',
    'NET_45',
    'NET_60',
    'NET_90',
    'DUE_ON_RECEIPT',
]);

export const VendorContactSchema = z.object({
    contactId: z.ulid(),
    isPrimary: z.boolean().default(false),
});

export const VendorCreateSchema = z.object({
    name: z.string().min(2),
    typeId: z.ulid().optional().nullable(),
    status: VendorStatusSchema,
    categoryTags: z.array(z.string().min(1)).optional(),
    taxId: z.string().min(1).optional().nullable(),
    address: z.string().min(1).optional().nullable(),
    email: z.email().optional().nullable(),
    phone: z.string().min(1).optional().nullable(),
    website: z.url().optional().nullable(),
    fax: z.string().min(1).optional().nullable(),
    paymentTerms: PaymentTermsSchema.default('NET_30'),
    notes: z.string().optional().nullable(),
    contacts: z.array(VendorContactSchema).nullable().optional(),
});

export type VendorCreateRequest = z.infer<typeof VendorCreateSchema>;

export const VendorUpdateSchema = VendorCreateSchema.extend({
    id: z.ulid(),
});

export type VendorUpdateRequest = z.infer<typeof VendorUpdateSchema>;

export const AddVendorDocumentSchema = z.object({
    vendorId: z.ulid(),
    fileId: z.ulid(),
    expiresOn: z.iso.date().optional().nullable(),
});

export type AddVendorDocumentRequest = z.infer<typeof AddVendorDocumentSchema>;

export const UpdateVendorDocumentSchema = z.object({
    vendorId: z.ulid(),
    fileId: z.ulid(),
    expiresOn: z.iso.date().optional().nullable(),
});

export type UpdateVendorDocumentRequest = z.infer<typeof UpdateVendorDocumentSchema>;

export const RemoveVendorDocumentSchema = z.object({
    vendorId: z.ulid(),
    fileId: z.ulid(),
});

export type RemoveVendorDocumentRequest = z.infer<typeof RemoveVendorDocumentSchema>;
