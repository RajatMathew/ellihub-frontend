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

const exclusiveVendorOrGc = {
    check: (data: { vendorId?: string | null; generalContractorId?: string | null }) =>
        !(data.vendorId && data.generalContractorId),
    message: 'A contact can be linked to a vendor OR a GC, not both',
};

export const ContactCreateSchema = z
    .object({
        fullName: z.string().min(2),
        professionalRoleId: z.ulid().optional().nullable(),
        email: z.array(ContactEmailSchema).min(1),
        phoneNumber: z.array(ContactPhoneSchema).optional().nullable(),
        tags: z.array(z.string().min(1)).optional(),
        vendorId: z.ulid().optional().nullable(),
        generalContractorId: z.ulid().optional().nullable(),
    })
    .refine(exclusiveVendorOrGc.check, { message: exclusiveVendorOrGc.message });

export type ContactCreateRequest = z.infer<typeof ContactCreateSchema>;

export const ContactUpdateSchema = z
    .object({
        id: z.ulid(),
        fullName: z.string().min(2),
        professionalRoleId: z.ulid().optional().nullable(),
        email: z.array(ContactEmailSchema).min(1),
        phoneNumber: z.array(ContactPhoneSchema).optional().nullable(),
        tags: z.array(z.string().min(1)).optional(),
        vendorId: z.ulid().optional().nullable(),
        generalContractorId: z.ulid().optional().nullable(),
    })
    .refine(exclusiveVendorOrGc.check, { message: exclusiveVendorOrGc.message });

export type ContactUpdateRequest = z.infer<typeof ContactUpdateSchema>;

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
