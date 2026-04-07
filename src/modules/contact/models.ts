import z from 'zod';

export const ContactEmailSchema = z.object({
    label: z.string().min(1).optional(),
    email: z.email(),
    isPrimary: z.boolean().optional(),
});

export type ContactEmail = z.infer<typeof ContactEmailSchema>;

export const ContactPhoneSchema = z.object({
    label: z.string().min(1).optional(),
    number: z.string().min(1),
    isPrimary: z.boolean().optional(),
});

export type ContactPhone = z.infer<typeof ContactPhoneSchema>;

export const LinkedCompanySchema = z.object({
    id: z.ulid(),
    isPrimary: z.boolean().default(false),
});

export const ContactCreateSchema = z.object({
    fullName: z.string().min(2),
    professionalRoleId: z.ulid().optional().nullable(),
    email: z.array(ContactEmailSchema).min(1),
    phoneNumber: z.array(ContactPhoneSchema).optional().nullable(),
    tags: z.array(z.string().min(1)).optional(),
    linkedGc: z.array(LinkedCompanySchema).optional().nullable(),
    linkedVendors: z.array(LinkedCompanySchema).optional().nullable(),
});

export type ContactCreateRequest = z.infer<typeof ContactCreateSchema>;

export const ContactUpdateSchema = ContactCreateSchema.extend({ id: z.ulid() });

export type ContactUpdateRequest = z.infer<typeof ContactUpdateSchema>;

export const AddGcToContactSchema = z.object({
    contactId: z.ulid(),
    generalContractorId: z.ulid(),
    isPrimary: z.boolean().default(false),
});

export type AddGcToContactRequest = z.infer<typeof AddGcToContactSchema>;

export const RemoveGcFromContactSchema = z.object({
    contactId: z.ulid(),
    generalContractorId: z.ulid(),
});

export type RemoveGcFromContactRequest = z.infer<typeof RemoveGcFromContactSchema>;

export const AddVendorToContactSchema = z.object({
    contactId: z.ulid(),
    vendorId: z.ulid(),
    isPrimary: z.boolean().default(false),
});

export type AddVendorToContactRequest = z.infer<typeof AddVendorToContactSchema>;

export const RemoveVendorFromContactSchema = z.object({
    contactId: z.ulid(),
    vendorId: z.ulid(),
});

export type RemoveVendorFromContactRequest = z.infer<typeof RemoveVendorFromContactSchema>;

export const AddEmailToContactSchema = z.object({
    contactId: z.ulid(),
    email: ContactEmailSchema,
});

export type AddEmailToContactRequest = z.infer<typeof AddEmailToContactSchema>;

export const RemoveEmailFromContactSchema = z.object({
    contactId: z.ulid(),
    email: z.email(),
});

export type RemoveEmailFromContactRequest = z.infer<typeof RemoveEmailFromContactSchema>;

export const AddPhoneToContactSchema = z.object({
    contactId: z.ulid(),
    phone: ContactPhoneSchema,
});

export type AddPhoneToContactRequest = z.infer<typeof AddPhoneToContactSchema>;

export const RemovePhoneFromContactSchema = z.object({
    contactId: z.ulid(),
    number: z.string().min(1),
});

export type RemovePhoneFromContactRequest = z.infer<typeof RemovePhoneFromContactSchema>;

export const AddTagToContactSchema = z.object({
    contactId: z.ulid(),
    tag: z.string().min(1),
});

export type AddTagToContactRequest = z.infer<typeof AddTagToContactSchema>;

export const RemoveTagFromContactSchema = z.object({
    contactId: z.ulid(),
    tag: z.string().min(1),
});

export type RemoveTagFromContactRequest = z.infer<typeof RemoveTagFromContactSchema>;
