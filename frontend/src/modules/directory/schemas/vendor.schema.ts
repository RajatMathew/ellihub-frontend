import { z } from 'zod';

// --- Enums ---

export const vendorTypeEnumSchema = z.enum([
  'MATERIAL',
  'FABRICATION',
  'INSTALLATION',
  'SUBCONTRACTOR',
]);
export type VendorTypeEnum = z.infer<typeof vendorTypeEnumSchema>;

export const vendorTypeObjectSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
});
export type VendorTypeObject = z.infer<typeof vendorTypeObjectSchema>;

// Current API returns an object for type or a string ID/enum
export const vendorTypeSchema = z.union([z.string(), vendorTypeObjectSchema]);
export type VendorType = z.infer<typeof vendorTypeSchema>;

export const vendorStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
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

const vendorEmailInputSchema = z
  .string()
  .trim()
  .refine(
    (value) => !value || z.string().email().safeParse(value).success,
    'Enter a valid vendor email'
  );

// --- Contact link (detail endpoint shape) ---

const contactEmailSchema = z.object({
  email: z.string(),
  label: z.string(),
  isPrimary: z.boolean().optional(),
});

const contactPhoneSchema = z.object({
  number: z.string(),
  label: z.string(),
  isPrimary: z.boolean().optional(),
});

export const vendorContactLinkContactSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    professionalRoleId: z.string().nullable().optional(),
    email: z.preprocess((val) => {
      if (!val) return [];
      if (typeof val === 'string') return [{ email: val, label: 'Email' }];
      return val;
    }, z.array(contactEmailSchema).default([])),
    phoneNumber: z.preprocess((val) => {
      if (!val) return [];
      if (typeof val === 'string') return [{ number: val, label: 'Phone' }];
      return val;
    }, z.array(contactPhoneSchema).default([])),
    tags: z.array(z.string()).optional().default([]),
    isPrimary: z.boolean().optional().default(false),
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
    contact: vendorContactLinkContactSchema.optional().nullable(),
  })
  .passthrough();

export type VendorContactLink = z.infer<typeof vendorContactLinkSchema>;

const vendorDocumentFileSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    displayName: z.string().nullable().optional(),
    mimeType: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const vendorDocumentSchema = z
  .object({
    id: z.string(),
    fileId: z.string(),
    vendorId: z.string(),
    expiresOn: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    file: vendorDocumentFileSchema.optional().nullable(),
  })
  .passthrough();

export type VendorDocument = z.infer<typeof vendorDocumentSchema>;

const vendorMetricsSchema = z.object({
  totalCommitted: z.coerce.number().optional().default(0),
  totalPaid: z.coerce.number().optional().default(0),
  outstandingBalance: z.coerce.number().optional().default(0),
  currentBalance: z.coerce.number().optional().default(0),
  purchaseOrderCount: z.number().optional().default(0),
  invoiceCount: z.number().optional().default(0),
  documentCount: z.number().optional().default(0),
});

// --- Main model (list view) ---

export const vendorSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'Vendor name is required'),
    typeId: z.string().nullable().optional(),
    type: vendorTypeSchema.nullable().optional(),
    categoryTags: z.array(z.string()).optional().default([]),
    phone: z.string().nullable().optional().default(null),
    email: z.string().nullable().optional().default(null),
    taxId: z.string().nullable().optional().default(null),
    website: z.string().nullable().optional().default(null),
    address: z.string().nullable().optional().default(null),
    paymentTerms: paymentTermsSchema.nullable().optional(),
    notes: z.string().nullable().optional().default(null),
    status: vendorStatusSchema,
    deletedAt: z.string().nullable().optional().default(null),
    createdAt: z.string().optional().default(''),
    updatedAt: z.string().optional().default(''),
    contactLinks: z.array(vendorContactLinkSchema).optional().default([]),
    contacts: z.array(vendorContactLinkContactSchema).optional().default([]),
    _count: z
      .object({
        contactLinks: z.number().default(0),
        contacts: z.number().default(0),
        documents: z.number().default(0),
        purchaseOrders: z.number().default(0),
        invoices: z.number().default(0),
      })
      .passthrough()
      .optional()
      .default({ contactLinks: 0, contacts: 0, documents: 0, purchaseOrders: 0, invoices: 0 }),
  })
  .merge(vendorMetricsSchema)
  .passthrough();

export type Vendor = z.infer<typeof vendorSchema>;

// --- Detail (includes contactLinks with nested contact) ---

export const vendorDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    typeId: z.string().nullable().optional(),
    type: vendorTypeSchema.nullable().optional(),
    categoryTags: z.array(z.string()).optional().default([]),
    phone: z.string().nullable().optional().default(null),
    email: z.string().nullable().optional().default(null),
    taxId: z.string().nullable().optional().default(null),
    website: z.string().nullable().optional().default(null),
    address: z.string().nullable().optional().default(null),
    paymentTerms: paymentTermsSchema.nullable().optional(),
    notes: z.string().nullable().optional().default(null),
    status: vendorStatusSchema,
    deletedAt: z.string().nullable().optional().default(null),
    createdAt: z.string().optional().default(''),
    updatedAt: z.string().optional().default(''),
    contactLinks: z.array(vendorContactLinkSchema).optional().default([]),
    contacts: z.array(vendorContactLinkContactSchema).optional().default([]),
    documents: z.array(vendorDocumentSchema).optional().default([]),
    _count: z
      .object({
        contactLinks: z.number().default(0),
        contacts: z.number().default(0),
        documents: z.number().default(0),
        purchaseOrders: z.number().default(0),
        invoices: z.number().default(0),
      })
      .passthrough()
      .optional()
      .default({ contactLinks: 0, contacts: 0, documents: 0, purchaseOrders: 0, invoices: 0 }),
  })
  .merge(vendorMetricsSchema)
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

export const vendorStatsSchema = z.object({
  totalVendors: z.number(),
  totalCommitted: z.coerce.number().default(0),
  totalPaid: z.coerce.number().default(0),
  outstandingBalance: z.coerce.number().default(0),
  currentBalance: z.coerce.number().default(0),
});

export type VendorStats = z.infer<typeof vendorStatsSchema>;

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
  typeId: z.string().optional(),
  type: vendorTypeSchema.optional(),
  categoryTags: z.array(z.string()).optional(),
  phone: z.string().optional(),
  email: vendorEmailInputSchema.optional(),
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
  typeId: z.string().optional(),
  type: vendorTypeSchema.optional(),
  categoryTags: z.array(z.string()).optional(),
  phone: z.string().nullable().optional(),
  email: vendorEmailInputSchema.nullable().optional(),
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
  email: vendorEmailInputSchema,
  type: z.string().min(1, 'Vendor type is required'),
  status: z.string(),
  taxId: z
    .string()
    .refine((val) => !val || /^\d{2}-?\d{7}$/.test(val), 'Enter a valid EIN (e.g. 12-3456789)'),
  website: z
    .string()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      'Enter a valid URL starting with http:// or https://'
    ),
  paymentTerms: z.string(),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

// --- Quick-create schema (used by QuickCreateVendorDialog) ---

export const quickCreateVendorSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  email: vendorEmailInputSchema,
  type: z.string().min(1, 'Vendor type is required'),
  status: vendorStatusSchema,
});

export type QuickCreateVendorValues = z.infer<typeof quickCreateVendorSchema>;

// --- Params ---

export const listVendorsParamsSchema = z.object({
  search: z.string().optional(),
  type: vendorTypeSchema.optional(),
  status: vendorStatusSchema.optional(),
  categoryTag: z.string().optional(),
  excludeIds: z.array(z.string()).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  sortBy: z.enum(['name', 'type', 'status', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListVendorsParams = z.infer<typeof listVendorsParamsSchema>;
