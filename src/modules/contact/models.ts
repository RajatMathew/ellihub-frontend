import z from 'zod';

export const ContactEmailSchema = z.object({
    label: z.string().min(1).optional(),
    address: z.email(),
    isPrimary: z.boolean().optional(),
});

export const ContactPhoneSchema = z.object({
    label: z.string().min(1).optional(),
    number: z.string().min(1),
    isPrimary: z.boolean().optional(),
});

export const ContactCreateSchema = z.object({
    fullName: z.string().min(2),
    professionalRoleId: z.ulid().optional().nullable(),
    email: z.array(ContactEmailSchema).optional().nullable(),
    phoneNumber: z.array(ContactPhoneSchema).optional().nullable(),
    tags: z.array(z.string().min(1)).optional(),
});

export type ContactCreateRequest = z.infer<typeof ContactCreateSchema>;

export const ContactUpdateSchema = ContactCreateSchema.partial();

export type ContactUpdateRequest = z.infer<typeof ContactUpdateSchema>;
