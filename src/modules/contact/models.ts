import z from 'zod';

const EmailItemSchema = z.object({
    email: z.string().email(),
    label: z.string().min(1),
});

const PhoneItemSchema = z.object({
    phone: z.string().min(1),
    label: z.string().min(1),
});

const EntityLinkItemSchema = z.object({
    entityTypeId: z.string().ulid(),
    entityId: z.string().ulid(),
});

export const ContactCreateSchema = z
    .object({
        fullName: z.string().min(1),
        professionalRoleId: z.string().ulid().optional(),
        emails: z.array(EmailItemSchema).optional().default([]),
        phoneNumbers: z.array(PhoneItemSchema).optional().default([]),
        tags: z.array(z.string()).optional().default([]),
        entityLinks: z.array(EntityLinkItemSchema).optional().default([]),
    })
    .refine((data) => data.emails.length > 0 || data.phoneNumbers.length > 0, {
        message: 'At least one email or phone number is required',
    });

export type ContactCreateRequest = z.infer<typeof ContactCreateSchema>;

export const ContactUpdateSchema = z.object({
    fullName: z.string().min(1),
    professionalRoleId: z.string().ulid().nullable(),
    emails: z.array(EmailItemSchema),
    phoneNumbers: z.array(PhoneItemSchema),
    tags: z.array(z.string()),
}).partial();

export type ContactUpdateRequest = z.infer<typeof ContactUpdateSchema>;

export const ContactQuerySchema = z.object({
    search: z.string().optional(),
    professionalRoleId: z.string().ulid().optional(),
    entityTypeId: z.string().ulid().optional(),
    entityId: z.string().ulid().optional(),
    page: z.coerce.number().int().positive().optional(),
    size: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(['fullName', 'createdAt', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ContactQueryParams = z.infer<typeof ContactQuerySchema>;

// ProfessionalRole schemas
export const ProfessionalRoleCreateSchema = z.object({
    name: z.string().min(1),
});

export type ProfessionalRoleCreateRequest = z.infer<typeof ProfessionalRoleCreateSchema>;

export const ProfessionalRoleUpdateSchema = z.object({
    name: z.string().min(1),
}).partial();

export type ProfessionalRoleUpdateRequest = z.infer<typeof ProfessionalRoleUpdateSchema>;

// ContactEntityType schemas
export const ContactEntityTypeCreateSchema = z.object({
    name: z.string().min(1),
});

export type ContactEntityTypeCreateRequest = z.infer<typeof ContactEntityTypeCreateSchema>;

export const ContactEntityTypeUpdateSchema = z.object({
    name: z.string().min(1),
}).partial();

export type ContactEntityTypeUpdateRequest = z.infer<typeof ContactEntityTypeUpdateSchema>;
