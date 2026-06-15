import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

const exclusiveVendorOrGc = {
    check: (data: { vendorId?: string | null; generalContractorId?: string | null }) =>
        !(data.vendorId && data.generalContractorId),
    message: 'A contact can be linked to a vendor OR a GC, not both',
};

const hasEmailOrPhone = {
    check: (data: { email?: string | null; phoneNumber?: string | null }) =>
        Boolean(data.email?.trim() || data.phoneNumber?.trim()),
    message: 'At least one email or phone number is required',
};

export const ContactCreateSchema = z
    .object({
        fullName: z.string().min(2, 'Full name should be at least 2 characters'),
        professionalRoleId: nanoIdSchema.optional().nullable(),
        email: z.email().optional().nullable(),
        phoneNumber: z.string().min(1).optional().nullable(),
        tags: z.array(z.string().min(1)).optional(),
        isPrimary: z.boolean().optional(),
        vendorId: nanoIdSchema.optional().nullable(),
        generalContractorId: nanoIdSchema.optional().nullable(),
    })
    .refine(hasEmailOrPhone.check, { message: hasEmailOrPhone.message })
    .refine(exclusiveVendorOrGc.check, { message: exclusiveVendorOrGc.message });

export type ContactCreateRequest = z.infer<typeof ContactCreateSchema>;

export const ContactUpdateSchema = z
    .object({
        id: nanoIdSchema,
        fullName: z.string().min(2, 'Full name should be at least 2 characters'),
        professionalRoleId: nanoIdSchema.optional().nullable(),
        email: z.email().optional().nullable(),
        phoneNumber: z.string().min(1).optional().nullable(),
        tags: z.array(z.string().min(1)).optional(),
        isPrimary: z.boolean().optional(),
        vendorId: nanoIdSchema.optional().nullable(),
        generalContractorId: nanoIdSchema.optional().nullable(),
        replaceExisting: z.boolean().optional(),
    })
    .refine(hasEmailOrPhone.check, { message: hasEmailOrPhone.message })
    .refine(exclusiveVendorOrGc.check, { message: exclusiveVendorOrGc.message });

export type ContactUpdateRequest = z.infer<typeof ContactUpdateSchema>;

export const AddTagToContactSchema = z.object({
    contactId: nanoIdSchema,
    tag: z.string().min(1),
});

export type AddTagToContactRequest = z.infer<typeof AddTagToContactSchema>;

export const RemoveTagFromContactSchema = z.object({
    contactId: nanoIdSchema,
    tag: z.string().min(1),
});

export type RemoveTagFromContactRequest = z.infer<typeof RemoveTagFromContactSchema>;

export const LinkContactSchema = z
    .object({
        contactId: nanoIdSchema,
        vendorId: nanoIdSchema.optional(),
        generalContractorId: nanoIdSchema.optional(),
        isPrimary: z.boolean().optional(),
        replaceExisting: z.boolean().optional(),
    })
    .refine((d) => Boolean(d.vendorId) !== Boolean(d.generalContractorId), {
        message: 'Provide exactly one of vendorId or generalContractorId',
    });

export type LinkContactRequest = z.infer<typeof LinkContactSchema>;

export const UnlinkContactSchema = z.object({
    contactId: nanoIdSchema,
});

export type UnlinkContactRequest = z.infer<typeof UnlinkContactSchema>;
