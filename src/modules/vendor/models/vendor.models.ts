import z from 'zod';

const VendorTypeEnum = z.enum(['MATERIAL', 'FABRICATION', 'INSTALLATION']);
const VendorStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'BLACKLISTED', 'PROSPECT']);
const PaymentTermsEnum = z.enum(['NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'DUE_ON_RECEIPT']);

const ContactLinkItemSchema = z.object({
    contactId: z.string().min(1),
    isPrimary: z.boolean().optional().default(false),
});

export const VendorCreateSchema = z.object({
    name: z.string().min(1),
    type: VendorTypeEnum,
    categoryTags: z.array(z.string()).optional().default([]),
    taxId: z.string().optional(),
    status: VendorStatusEnum.optional().default('ACTIVE'),
    address: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    paymentTerms: PaymentTermsEnum.optional().default('NET_30'),
    notes: z.string().optional(),
    contacts: z.array(ContactLinkItemSchema).optional().default([]),
});

export type VendorCreateRequest = z.infer<typeof VendorCreateSchema>;

export const VendorUpdateSchema = z.object({
    name: z.string().min(1),
    type: VendorTypeEnum,
    categoryTags: z.array(z.string()),
    taxId: z.string().nullable(),
    status: VendorStatusEnum,
    address: z.string().nullable(),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
    website: z.string().nullable(),
    paymentTerms: PaymentTermsEnum,
    notes: z.string().nullable(),
}).partial();

export type VendorUpdateRequest = z.infer<typeof VendorUpdateSchema>;

export const VendorContactAddSchema = z.object({
    contactId: z.string().min(1),
    isPrimary: z.boolean().optional().default(false),
});

export type VendorContactAddRequest = z.infer<typeof VendorContactAddSchema>;

export const VendorContactUpdateSchema = z.object({
    isPrimary: z.boolean(),
});

export type VendorContactUpdateRequest = z.infer<typeof VendorContactUpdateSchema>;
