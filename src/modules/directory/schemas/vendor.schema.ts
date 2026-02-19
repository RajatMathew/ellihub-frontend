import { z } from 'zod';

// --- Enums ---

export const vendorTypeSchema = z.enum([
  'MATERIAL',
  'FABRICATION',
  'INSTALLATION',
  'SUBCONTRACTOR',
]);
export type VendorType = z.infer<typeof vendorTypeSchema>;

export const vendorStatusSchema = z.enum([
  'PROSPECT',
  'ACTIVE',
  'BLACKLISTED',
  'INACTIVE',
]);
export type VendorStatus = z.infer<typeof vendorStatusSchema>;

export const paymentTermsSchema = z.enum([
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'NET_90',
  'DUE_ON_RECEIPT',
]);
export type PaymentTerms = z.infer<typeof paymentTermsSchema>;

// --- Contact link (detail endpoint shape) ---

const contactEmailSchema = z
  .object({ email: z.string(), label: z.string() })
  .nullable()
  .optional();

const contactPhoneSchema = z
  .object({ phone: z.string(), label: z.string() })
  .nullable()
  .optional();

export const vendorContactLinkContactSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    professionalRoleId: z.string().nullable().optional(),
    email: contactEmailSchema,
    phoneNumber: contactPhoneSchema,
    tags: z.array(z.string()).optional().default([]),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type VendorContactLinkContact = z.infer<typeof vendorContactLinkContactSchema>;

export const vendorContactLinkSchema = z
  .object({
    id: z.string(),
    contactId: z.string(),
    vendorId: z.string(),
    isPrimary: z.boolean(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    contact: vendorContactLinkContactSchema,
  })
  .passthrough();

export type VendorContactLink = z.infer<typeof vendorContactLinkSchema>;

// --- Main model (list view) ---

export const vendorSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'Vendor name is required'),
    type: vendorTypeSchema,
    categoryTags: z.array(z.string()).optional().default([]),
    phone: z.string().nullable().optional().default(null),
    email: z.string().nullable().optional().default(null),
    taxId: z.string().nullable().optional().default(null),
    website: z.string().nullable().optional().default(null),
    address: z.string().nullable().optional().default(null),
    paymentTerms: paymentTermsSchema.optional().default('NET_30'),
    notes: z.string().nullable().optional().default(null),
    status: vendorStatusSchema,
    deletedAt: z.string().nullable().optional().default(null),
    createdAt: z.string().optional().default(''),
    updatedAt: z.string().optional().default(''),
    _count: z
      .object({
        contactLinks: z.number().default(0),
      })
      .passthrough()
      .optional()
      .default({ contactLinks: 0 }),
  })
  .passthrough();

export type Vendor = z.infer<typeof vendorSchema>;

// --- Detail (includes contactLinks with nested contact) ---

export const vendorDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: vendorTypeSchema,
    categoryTags: z.array(z.string()).optional().default([]),
    phone: z.string().nullable().optional().default(null),
    email: z.string().nullable().optional().default(null),
    taxId: z.string().nullable().optional().default(null),
    website: z.string().nullable().optional().default(null),
    address: z.string().nullable().optional().default(null),
    paymentTerms: paymentTermsSchema.optional().default('NET_30'),
    notes: z.string().nullable().optional().default(null),
    status: vendorStatusSchema,
    deletedAt: z.string().nullable().optional().default(null),
    createdAt: z.string().optional().default(''),
    updatedAt: z.string().optional().default(''),
    contactLinks: z.array(vendorContactLinkSchema).optional().default([]),
  })
  .passthrough();

export type VendorDetail = z.infer<typeof vendorDetailSchema>;

// --- List ---

export const vendorPaginatedResponseSchema = z.object({
  data: z.array(vendorSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type VendorPaginatedResponse = z.infer<typeof vendorPaginatedResponseSchema>;

// --- Inputs ---

export const createVendorContactInputSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  role: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export type CreateVendorContactInput = z.infer<typeof createVendorContactInputSchema>;

export const createVendorInputSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  type: vendorTypeSchema,
  categoryTags: z.array(z.string()).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  taxId: z.string().optional(),
  website: z.string().optional(),
  paymentTerms: paymentTermsSchema.optional(),
  notes: z.string().optional(),
  status: vendorStatusSchema.optional(),
  contacts: z.array(createVendorContactInputSchema).optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorInputSchema>;

export const updateVendorInputSchema = z.object({
  name: z.string().min(1).optional(),
  type: vendorTypeSchema.optional(),
  categoryTags: z.array(z.string()).optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  taxId: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  paymentTerms: paymentTermsSchema.optional(),
  notes: z.string().nullable().optional(),
  status: vendorStatusSchema.optional(),
});

export type UpdateVendorInput = z.infer<typeof updateVendorInputSchema>;

export const updateVendorContactInputSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export type UpdateVendorContactInput = z.infer<typeof updateVendorContactInputSchema>;

// --- Form schema (used by vendor-form page) ---

export const vendorFormSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  type: z.string().min(1, 'Vendor type is required'),
  status: z.string(),
  taxId: z.string(),
  website: z.string(),
  paymentTerms: z.string(),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

// --- Quick-create schema (used by QuickCreateVendorDialog) ---

export const quickCreateVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  type: vendorTypeSchema,
  status: vendorStatusSchema,
});

export type QuickCreateVendorValues = z.infer<typeof quickCreateVendorSchema>;

// --- Params ---

export const listVendorsParamsSchema = z.object({
  search: z.string().optional(),
  type: vendorTypeSchema.optional(),
  status: vendorStatusSchema.optional(),
  categoryTag: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  sortBy: z.enum(['name', 'type', 'status', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListVendorsParams = z.infer<typeof listVendorsParamsSchema>;
