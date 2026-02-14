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

// --- Vendor Contact ---

export const vendorContactSchema = z.object({
  id: z.string(),
  vendorId: z.string(),
  fullName: z.string(),
  role: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  isPrimary: z.boolean(),
  createdAt: z.string(),
});

export type VendorContact = z.infer<typeof vendorContactSchema>;

// --- Main model (list view) ---

export const vendorSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Vendor name is required'),
  type: vendorTypeSchema,
  categoryTags: z.array(z.string()),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  taxId: z.string().nullable(),
  website: z.string().nullable(),
  paymentTerms: paymentTermsSchema,
  notes: z.string().nullable(),
  status: vendorStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ contacts: z.number() }),
});

export type Vendor = z.infer<typeof vendorSchema>;

// --- Detail (includes nested contacts) ---

export const vendorDetailSchema = vendorSchema.omit({ _count: true }).extend({
  contacts: z.array(vendorContactSchema),
});

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
