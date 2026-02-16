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

/** Input-only phone validation (not used for API response parsing). */
export const contactPhoneInputSchema = z.object({
  phone: z
    .string()
    .refine((val) => /^[+\d\s\-().]+$/.test(val), 'Phone number contains invalid characters')
    .refine((val) => val.replace(/\D/g, '').length >= 7, 'Enter a valid phone number'),
  label: z.string(),
});

export type ContactPhone = z.infer<typeof contactPhoneSchema>;

// --- Relation types ---

export const professionalRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ProfessionalRole = z.infer<typeof professionalRoleSchema>;

export const contactVendorLinkSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  vendorId: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ContactVendorLink = z.infer<typeof contactVendorLinkSchema>;

export const contactGCLinkSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  generalContractorId: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ContactGCLink = z.infer<typeof contactGCLinkSchema>;

// --- Main model ---

export const contactSchema = z.object({
  id: z.string(),
  fullName: z.string().min(1, 'Name is required'),
  professionalRoleId: z.string().nullable(),
  professionalRole: professionalRoleSchema.nullable(),
  email: contactEmailSchema.nullable(),
  phoneNumber: contactPhoneSchema.nullable(),
  tags: z.array(z.string()),
  vendorLinks: z.array(contactVendorLinkSchema),
  gcLinks: z.array(contactGCLinkSchema),
  deletedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Contact = z.infer<typeof contactSchema>;

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

export const createContactInputSchema = z
  .object({
    fullName: z.string().min(1, 'Name is required'),
    professionalRoleId: z.string().optional(),
    email: contactEmailSchema.nullable().optional(),
    phoneNumber: contactPhoneSchema.nullable().optional(),
    tags: z.array(z.string()).optional(),
    vendorLinks: z
      .array(z.object({ vendorId: z.string(), isPrimary: z.boolean().optional() }))
      .optional(),
    gcLinks: z
      .array(
        z.object({ generalContractorId: z.string(), isPrimary: z.boolean().optional() }),
      )
      .optional(),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: 'At least one email or phone number is required',
    path: ['email'],
  });

export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const updateContactInputSchema = z.object({
  fullName: z.string().min(1).optional(),
  professionalRoleId: z.string().nullable().optional(),
  email: contactEmailSchema.nullable().optional(),
  phoneNumber: contactPhoneSchema.nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;

// --- Filters / Params ---

export const listContactsParamsSchema = z.object({
  search: z.string().optional(),
  professionalRoleId: z.string().optional(),
  vendorId: z.string().optional(),
  generalContractorId: z.string().optional(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.enum(['fullName', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListContactsParams = z.infer<typeof listContactsParamsSchema>;

// --- KPIs ---

export const directoryKpisSchema = z.object({
  totalContacts: z.number(),
  primaryContacts: z.number(),
  gcLinks: z.number(),
  vendorLinks: z.number(),
});

export type DirectoryKpis = z.infer<typeof directoryKpisSchema>;
