import { z } from 'zod';

// --- Json field shapes ---

export const contactEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  label: z.string(),
});

export type ContactEmail = z.infer<typeof contactEmailSchema>;

export const contactPhoneSchema = z.object({
  phone: z.string(),
  label: z.string(),
});

export type ContactPhone = z.infer<typeof contactPhoneSchema>;

// --- Entity references (resolved in detail) ---

const entityRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// --- Main model ---

export const contactSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  emails: z.array(contactEmailSchema),
  phoneNumbers: z.array(contactPhoneSchema),
  jobTitle: z.string().min(1, 'Job title is required'),
  vendorId: z.string().nullable(),
  generalContractorId: z.string().nullable(),
  tags: z.array(z.string()),
  deletedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Contact = z.infer<typeof contactSchema>;

// --- Detail (includes resolved vendor/GC names) ---

export const contactDetailSchema = contactSchema.extend({
  vendor: entityRefSchema.nullable(),
  generalContractor: entityRefSchema.nullable(),
});

export type ContactDetail = z.infer<typeof contactDetailSchema>;

// --- List ---

export const contactListSchema = z.array(contactSchema);

export const contactPaginatedResponseSchema = z.object({
  data: contactListSchema,
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type ContactPaginatedResponse = z.infer<typeof contactPaginatedResponseSchema>;

// --- Inputs ---

export const createContactInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  emails: z.array(contactEmailSchema),
  phoneNumbers: z.array(contactPhoneSchema),
  tags: z.array(z.string()).optional(),
  vendorId: z.string().nullable().optional(),
  generalContractorId: z.string().nullable().optional(),
});

export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const updateContactInputSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  jobTitle: z.string().min(1, 'Job title is required').optional(),
  emails: z.array(contactEmailSchema).optional(),
  phoneNumbers: z.array(contactPhoneSchema).optional(),
  tags: z.array(z.string()).optional(),
  vendorId: z.string().nullable().optional(),
  generalContractorId: z.string().nullable().optional(),
});

export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;

// --- Filters / Params ---

export const listContactsParamsSchema = z.object({
  search: z.string().optional(),
  jobTitle: z.string().optional(),
  vendorId: z.string().optional(),
  generalContractorId: z.string().optional(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.enum(['name', 'jobTitle', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListContactsParams = z.infer<typeof listContactsParamsSchema>;

// --- KPIs ---

export const directoryKpisSchema = z.object({
  totalContacts: z.number(),
  withVendor: z.number(),
  withGC: z.number(),
});

export type DirectoryKpis = z.infer<typeof directoryKpisSchema>;
