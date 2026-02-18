import { z } from 'zod';

// --- Enums ---

export const gcTypeCodeSchema = z.enum([
  'PUBLIC_STATE',
  'PRIVATE',
  'INSTITUTIONAL',
  'CIVIL',
  'SCA',
]);
export type GCTypeCode = z.infer<typeof gcTypeCodeSchema>;

export const gcStatusSchema = z.enum(['PROSPECTING', 'ACTIVE', 'INACTIVE']);
export type GCStatus = z.infer<typeof gcStatusSchema>;

export const paymentTermsSchema = z.enum([
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'NET_90',
  'DUE_ON_RECEIPT',
]);
export type PaymentTerms = z.infer<typeof paymentTermsSchema>;

// --- GC Type (nested object from API) ---

export const gcTypeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: gcTypeCodeSchema,
    description: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type GCType = z.infer<typeof gcTypeSchema>;

// --- Contact link (detail endpoint shape) ---

const contactEmailSchema = z
  .object({ email: z.string(), label: z.string() })
  .nullable()
  .optional();

const contactPhoneSchema = z
  .object({ phone: z.string(), label: z.string() })
  .nullable()
  .optional();

export const gcContactLinkContactSchema = z
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

export type GCContactLinkContact = z.infer<typeof gcContactLinkContactSchema>;

export const gcContactLinkSchema = z
  .object({
    id: z.string(),
    contactId: z.string(),
    generalContractorId: z.string(),
    isPrimary: z.boolean(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    contact: gcContactLinkContactSchema,
  })
  .passthrough();

export type GCContactLink = z.infer<typeof gcContactLinkSchema>;

// --- Main model (list view) ---

export const generalContractorSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'GC name is required'),
    gcTypeId: z.string(),
    gcType: gcTypeSchema,
    status: gcStatusSchema,
    address: z.string().nullable().optional().default(null),
    phone: z.string().nullable().optional().default(null),
    email: z.string().nullable().optional().default(null),
    website: z.string().nullable().optional().default(null),
    paymentTerms: paymentTermsSchema.optional().default('NET_30'),
    retainagePercent: z.number().optional().default(10.0),
    deletedAt: z.string().nullable().optional().default(null),
    createdAt: z.string().optional().default(''),
    updatedAt: z.string().optional().default(''),
    _count: z
      .object({
        projects: z.number().default(0),
        contactLinks: z.number().default(0),
      })
      .optional()
      .default({ projects: 0, contactLinks: 0 }),
  })
  .passthrough();

export type GeneralContractor = z.infer<typeof generalContractorSchema>;

// --- Detail (includes contactLinks with nested contact, and projects) ---

export const generalContractorDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    gcTypeId: z.string(),
    gcType: gcTypeSchema,
    status: gcStatusSchema,
    address: z.string().nullable().optional().default(null),
    phone: z.string().nullable().optional().default(null),
    email: z.string().nullable().optional().default(null),
    website: z.string().nullable().optional().default(null),
    paymentTerms: paymentTermsSchema.optional().default('NET_30'),
    retainagePercent: z.number().optional().default(10.0),
    deletedAt: z.string().nullable().optional().default(null),
    createdAt: z.string().optional().default(''),
    updatedAt: z.string().optional().default(''),
    contactLinks: z.array(gcContactLinkSchema).optional().default([]),
    projects: z.array(z.object({ id: z.string() }).passthrough()).optional().default([]),
  })
  .passthrough();

export type GeneralContractorDetail = z.infer<typeof generalContractorDetailSchema>;

// --- List ---

export const gcPaginatedResponseSchema = z.object({
  data: z.array(generalContractorSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type GCPaginatedResponse = z.infer<typeof gcPaginatedResponseSchema>;

// --- Stats ---

export const gcStatsSchema = z
  .object({
    totalGCs: z.number().default(0),
    activeProjects: z.number().default(0),
    totalCommitted: z.number().default(0),
  })
  .passthrough();

export type GCStats = z.infer<typeof gcStatsSchema>;

// --- Inputs ---

export const createGCInputSchema = z.object({
  name: z.string().min(1, 'GC name is required'),
  gcTypeId: z.string().min(1, 'GC type is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  address: z.string().optional(),
  paymentTerms: paymentTermsSchema.optional(),
  retainagePercent: z.number().min(0).max(100).optional(),
  status: gcStatusSchema.optional(),
});

export type CreateGCInput = z.infer<typeof createGCInputSchema>;

export const updateGCInputSchema = z.object({
  name: z.string().min(1).optional(),
  gcTypeId: z.string().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  paymentTerms: paymentTermsSchema.optional(),
  retainagePercent: z.number().min(0).max(100).optional(),
  status: gcStatusSchema.optional(),
});

export type UpdateGCInput = z.infer<typeof updateGCInputSchema>;

// --- Contact link inputs ---

export const addGCContactLinkInputSchema = z.object({
  contactId: z.string(),
  isPrimary: z.boolean().optional(),
});

export type AddGCContactLinkInput = z.infer<typeof addGCContactLinkInputSchema>;

// --- Params ---

export const listGCsParamsSchema = z.object({
  search: z.string().optional(),
  gcTypeId: z.string().optional(),
  status: gcStatusSchema.optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  sortBy: z.enum(['name', 'type', 'status', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListGCsParams = z.infer<typeof listGCsParamsSchema>;
