import { z } from 'zod';

// --- Enums ---

export const gcTypeSchema = z.enum(['PUBLIC_STATE', 'PRIVATE', 'INSTITUTIONAL']);
export type GCType = z.infer<typeof gcTypeSchema>;

export const gcStatusSchema = z.enum(['PROSPECT', 'ACTIVE', 'INACTIVE']);
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

// --- GC Contact ---

export const gcContactSchema = z.object({
  id: z.string(),
  gcId: z.string(),
  fullName: z.string(),
  organizationRole: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  createdAt: z.string(),
});

export type GCContact = z.infer<typeof gcContactSchema>;

// --- Main model (list view) ---

export const generalContractorSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'GC name is required'),
  type: gcTypeSchema,
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  paymentTerms: paymentTermsSchema,
  retainagePercent: z.number(),
  status: gcStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({ contacts: z.number(), projects: z.number() }),
});

export type GeneralContractor = z.infer<typeof generalContractorSchema>;

// --- Detail (includes nested contacts) ---

export const generalContractorDetailSchema = generalContractorSchema
  .omit({ _count: true })
  .extend({
    contacts: z.array(gcContactSchema),
  });

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

export const gcStatsSchema = z.object({
  totalGCs: z.number(),
  activeProjects: z.number(),
  totalCommitted: z.number(),
});

export type GCStats = z.infer<typeof gcStatsSchema>;

// --- Inputs ---

export const createGCContactInputSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  organizationRole: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export type CreateGCContactInput = z.infer<typeof createGCContactInputSchema>;

export const createGCInputSchema = z.object({
  name: z.string().min(1, 'GC name is required'),
  type: gcTypeSchema,
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
  paymentTerms: paymentTermsSchema.optional(),
  retainagePercent: z.number().min(0).max(100).optional(),
  status: gcStatusSchema.optional(),
  contacts: z.array(createGCContactInputSchema).optional(),
});

export type CreateGCInput = z.infer<typeof createGCInputSchema>;

export const updateGCInputSchema = z.object({
  name: z.string().min(1).optional(),
  type: gcTypeSchema.optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().nullable().optional(),
  paymentTerms: paymentTermsSchema.optional(),
  retainagePercent: z.number().min(0).max(100).optional(),
  status: gcStatusSchema.optional(),
});

export type UpdateGCInput = z.infer<typeof updateGCInputSchema>;

export const updateGCContactInputSchema = z.object({
  fullName: z.string().min(1).optional(),
  organizationRole: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export type UpdateGCContactInput = z.infer<typeof updateGCContactInputSchema>;

// --- Params ---

export const listGCsParamsSchema = z.object({
  search: z.string().optional(),
  type: gcTypeSchema.optional(),
  status: gcStatusSchema.optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).optional(),
  sortBy: z.enum(['name', 'type', 'status', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListGCsParams = z.infer<typeof listGCsParamsSchema>;
