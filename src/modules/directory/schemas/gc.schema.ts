import { z } from 'zod';

// --- Enums ---

export const gcTypeCodeSchema = z.string();
export type GCTypeCode = string;

export const gcStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
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
    name: z.string().optional(),
    label: z.string().optional(),
    code: z.string().optional(),
    description: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type GCType = z.infer<typeof gcTypeSchema>;

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

const normalizeContactEmailValue = (val: unknown) => {
  if (!val) return [];
  if (typeof val === 'string') return [{ email: val, label: 'Email' }];
  return val;
};

const normalizeContactPhoneValue = (val: unknown) => {
  if (!val) return [];
  if (typeof val === 'string') return [{ number: val, label: 'Phone' }];
  return val;
};

export const gcContactLinkContactSchema = z
  .object({
    id: z.string(),
    fullName: z.string(),
    professionalRoleId: z.string().nullable().optional(),
    email: z.preprocess(normalizeContactEmailValue, z.array(contactEmailSchema).default([])),
    phoneNumber: z.preprocess(normalizeContactPhoneValue, z.array(contactPhoneSchema).default([])),
    tags: z.array(z.string()).optional().default([]),
    isPrimary: z.boolean().optional().default(false),
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

// --- Project summary (detail endpoint shape) ---

export const gcProjectSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    jobNumber: z.string().nullable().optional(),
    status: z.string(),
    contractValue: z.coerce.number().optional().default(0),
    estimatedStartDate: z.string().nullable().optional(),
    estimatedEndDate: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type GCProject = z.infer<typeof gcProjectSchema>;

// --- Main model (list view) ---

export const generalContractorSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'GC name is required'),
    gcTypeId: z.string().nullable().optional(),
    gcType: gcTypeSchema.nullable().optional(),
    status: gcStatusSchema,
    address: z.string().nullable().optional().default(null),
    phone: z.string().nullable().optional().default(null),
    email: z.string().nullable().optional().default(null),
    website: z.string().nullable().optional().default(null),
    paymentTerms: paymentTermsSchema.nullable().optional(),
    retainagePercent: z.number().optional().default(10.0),
    deletedAt: z.string().nullable().optional().default(null),
    createdAt: z.string().optional().default(''),
    activeProjects: z.number().optional(),
    totalCommitted: z.coerce.number().optional(),
    contactLinks: z.array(gcContactLinkSchema).optional().default([]),
    contacts: z.array(gcContactLinkContactSchema).optional().default([]),
    _count: z
      .object({
        projects: z.number().default(0),
        contactLinks: z.number().default(0),
        contacts: z.number().default(0),
      })
      .optional()
      .default({ projects: 0, contactLinks: 0, contacts: 0 }),
  })
  .passthrough();

export type GeneralContractor = z.infer<typeof generalContractorSchema>;

// --- Detail (includes contactLinks with nested contact, and projects) ---

export const generalContractorDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    gcTypeId: z.string().nullable().optional(),
    gcType: gcTypeSchema.nullable().optional(),
    status: gcStatusSchema,
    address: z.string().nullable().optional().default(null),
    phone: z.string().nullable().optional().default(null),
    email: z.string().nullable().optional().default(null),
    website: z.string().nullable().optional().default(null),
    paymentTerms: paymentTermsSchema.nullable().optional(),
    retainagePercent: z.number().optional().default(10.0),
    deletedAt: z.string().nullable().optional().default(null),
    createdAt: z.string().optional().default(''),
    updatedAt: z.string().optional().default(''),
    activeProjects: z.number().optional(),
    totalCommitted: z.coerce.number().optional(),
    contactLinks: z.array(gcContactLinkSchema).optional().default([]),
    contacts: z.array(gcContactLinkContactSchema).optional().default([]),
    projects: z.array(gcProjectSchema).optional().default([]),
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

// --- Form schema (used by gc-form page) ---

export const gcFormSchema = z.object({
  name: z.string().min(1, 'GC name is required'),
  gcTypeId: z.string().min(1, 'GC type is required'),
  website: z
    .string()
    .refine(
      (val) => !val || /^https?:\/\/.+/.test(val),
      'Enter a valid URL starting with http:// or https://'
    ),
  status: gcStatusSchema,
  email: z
    .string()
    .refine((val) => !val || z.string().email().safeParse(val).success, 'Invalid email address'),
  phone: z
    .string()
    .refine(
      (val) => !val || /^[+\d\s\-().]+$/.test(val),
      'Phone number contains invalid characters'
    )
    .refine((val) => !val || val.replace(/\D/g, '').length >= 7, 'Enter a valid phone number'),
  address: z.string(),
  paymentTerms: paymentTermsSchema,
  retainagePercent: z.number().min(0).max(100),
});

export type GCFormValues = z.infer<typeof gcFormSchema>;

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
