import { nanoIdSchema } from '@utils/zod';
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

const VendorEmailSchema = z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().toLowerCase();
    return trimmed ? trimmed : null;
}, z.email().nullable().optional());

export const VendorCreateSchema = z.object({
    name: z.string().min(2),
    typeId: nanoIdSchema.optional().nullable(),
    status: VendorStatusSchema,
    categoryTags: z.array(z.string().min(1)).optional(),
    taxId: z.string().min(1).optional().nullable(),
    address: z.string().min(1).optional().nullable(),
    email: VendorEmailSchema,
    phone: z.string().min(1).optional().nullable(),
    website: z.url().optional().nullable(),
    fax: z.string().min(1).optional().nullable(),
    paymentTerms: PaymentTermsSchema.default('NET_30'),
    notes: z.string().optional().nullable(),
});

export type VendorCreateRequest = z.infer<typeof VendorCreateSchema>;

export const VendorUpdateSchema = VendorCreateSchema.extend({
    id: nanoIdSchema,
});

export type VendorUpdateRequest = z.infer<typeof VendorUpdateSchema>;

export const AddVendorDocumentSchema = z.object({
    vendorId: nanoIdSchema,
    fileId: nanoIdSchema,
    expiresOn: z.iso.date().optional().nullable(),
});

export type AddVendorDocumentRequest = z.infer<typeof AddVendorDocumentSchema>;

export const UpdateVendorDocumentSchema = z.object({
    vendorId: nanoIdSchema,
    fileId: nanoIdSchema,
    expiresOn: z.iso.date().optional().nullable(),
});

export type UpdateVendorDocumentRequest = z.infer<typeof UpdateVendorDocumentSchema>;

export const RemoveVendorDocumentSchema = z.object({
    vendorId: nanoIdSchema,
    fileId: nanoIdSchema,
});

export type RemoveVendorDocumentRequest = z.infer<typeof RemoveVendorDocumentSchema>;
