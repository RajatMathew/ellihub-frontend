import z from 'zod';

export const LookupCreateSchema = z.object({
    type: z.string().min(1),
    label: z.string().min(1),
});

export type LookupCreateRequest = z.infer<typeof LookupCreateSchema>;

export const LookupUpdateSchema = LookupCreateSchema.extend({ id: z.ulid() });

export type LookupUpdateRequest = z.infer<typeof LookupUpdateSchema>;

export enum LookupType {
    PROFESSIONAL_ROLE = 'PROFESSIONAL_ROLE',
    VENDOR_TYPE = 'VENDOR_TYPE',
    GC_TYPE = 'GC_TYPE',
}
