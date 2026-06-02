import { z } from 'zod';

// --- Json field shapes ---

export const contactEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  label: z.string(),
  isPrimary: z.boolean().optional(),
});

export type ContactEmail = z.infer<typeof contactEmailSchema>;

export const contactPhoneSchema = z.object({
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

/** Input-only phone validation (not used for API response parsing). */
export const contactPhoneInputSchema = z.object({
  number: z
    .string()
    .refine((val) => /^[+\d\s\-().]+$/.test(val), 'Phone number contains invalid characters')
    .refine((val) => val.replace(/\D/g, '').length >= 7, 'Enter a valid phone number'),
  label: z.string(),
});

/** Form-level phone validation — errors surface on the object (for Controller fieldState). */
export const contactPhoneFormSchema = z
  .object({
    number: z.string(),
    label: z.string(),
  })
  .refine((data) => /^[+\d\s\-().]+$/.test(data.number), 'Phone number contains invalid characters')
  .refine((data) => data.number.replace(/\D/g, '').length >= 7, 'Enter a valid phone number');

export type ContactPhone = z.infer<typeof contactPhoneSchema>;

// --- Relation types ---

export const professionalRoleSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    label: z.string().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type ProfessionalRole = z.infer<typeof professionalRoleSchema>;

export const contactVendorLinkSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  vendorId: z.string(),
  isPrimary: z.boolean().optional().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ContactVendorLink = z.infer<typeof contactVendorLinkSchema>;

export const contactGCLinkSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  generalContractorId: z.string(),
  isPrimary: z.boolean().optional().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ContactGCLink = z.infer<typeof contactGCLinkSchema>;

// --- Main model ---

export const contactSchema = z.object({
  id: z.string(),
  fullName: z.string().min(1, 'Name is required'),
  professionalRoleId: z.string().nullable(),
  professionalRole: professionalRoleSchema.nullish(),
  email: z.preprocess(normalizeContactEmailValue, z.array(contactEmailSchema).default([])),
  phoneNumber: z.preprocess(normalizeContactPhoneValue, z.array(contactPhoneSchema).default([])),
  tags: z.array(z.string()).default([]),
  isPrimary: z.boolean().optional().default(false),
  vendorId: z.string().nullable().optional(),
  generalContractorId: z.string().nullable().optional(),
  vendor: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  generalContractor: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  vendorLinks: z.array(contactVendorLinkSchema).default([]),
  gcLinks: z.array(contactGCLinkSchema).default([]),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
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

// --- Form Schema (UI Only) ---

export const contactFormSchema = z
  .object({
    fullName: z.string().min(2, 'Full name should be at least 2 characters'),
    professionalRoleId: z.string().optional(),
    email: contactEmailSchema.nullable().optional(),
    phoneNumber: contactPhoneFormSchema.nullable().optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (data) => (data.email && data.email.email) || (data.phoneNumber && data.phoneNumber.number),
    {
      message: 'At least one email or phone number is required',
      path: ['email'],
    }
  );

export type ContactFormValues = z.infer<typeof contactFormSchema>;

// --- Inputs ---

export const createContactInputSchema = z.object({
  fullName: z.string().min(2, 'Full name should be at least 2 characters'),
  professionalRoleId: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  phoneNumber: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPrimary: z.boolean().optional(),
  vendorId: z.string().optional(),
  generalContractorId: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof createContactInputSchema>;

export const updateContactInputSchema = z.object({
  fullName: z.string().min(1).optional(),
  professionalRoleId: z.string().nullable().optional(),
  email: z.string().email('Invalid email address').optional(),
  phoneNumber: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPrimary: z.boolean().optional(),
  vendorId: z.string().optional(),
  generalContractorId: z.string().optional(),
});

export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;

// --- Quick-create schema (used by QuickCreateContactDialog) ---

export const quickCreateContactSchema = z
  .object({
    fullName: z.string().min(1, 'Name is required'),
    professionalRoleId: z.string().optional(),
    email: z
      .string()
      .refine((val) => !val || z.string().email().safeParse(val).success, 'Invalid email address')
      .optional(),
    phone: z
      .string()
      .refine(
        (val) => !val || /^[+\d\s\-().]+$/.test(val),
        'Phone number contains invalid characters'
      )
      .refine((val) => !val || val.replace(/\D/g, '').length >= 7, 'Enter a valid phone number')
      .optional(),
  })
  .refine((data) => (data.email && data.email.trim()) || (data.phone && data.phone.trim()), {
    message: 'At least one email or phone number is required',
    path: ['email'],
  });

export type QuickCreateContactValues = z.infer<typeof quickCreateContactSchema>;

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
