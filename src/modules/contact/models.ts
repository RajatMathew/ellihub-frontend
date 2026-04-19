import z from 'zod';

const exclusiveVendorOrGc = {
    check: (data: { vendorId?: string | null; generalContractorId?: string | null }) =>
        !(data.vendorId && data.generalContractorId),
    message: 'A contact can be linked to a vendor OR a GC, not both',
};

export const ContactCreateSchema = z
    .object({
        fullName: z.string().min(2),
        professionalRoleId: z.ulid().optional().nullable(),
        email: z.email(),
        phoneNumber: z.string().min(1).optional().nullable(),
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
        email: z.email(),
        phoneNumber: z.string().min(1).optional().nullable(),
        tags: z.array(z.string().min(1)).optional(),
        vendorId: z.ulid().optional().nullable(),
        generalContractorId: z.ulid().optional().nullable(),
    })
    .refine(exclusiveVendorOrGc.check, { message: exclusiveVendorOrGc.message });

export type ContactUpdateRequest = z.infer<typeof ContactUpdateSchema>;

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

export const LinkContactSchema = z
    .object({
        contactId: z.ulid(),
        vendorId: z.ulid().optional(),
        generalContractorId: z.ulid().optional(),
    })
    .refine((d) => Boolean(d.vendorId) !== Boolean(d.generalContractorId), {
        message: 'Provide exactly one of vendorId or generalContractorId',
    });

export type LinkContactRequest = z.infer<typeof LinkContactSchema>;

export const UnlinkContactSchema = z.object({
    contactId: z.ulid(),
});

export type UnlinkContactRequest = z.infer<typeof UnlinkContactSchema>;
