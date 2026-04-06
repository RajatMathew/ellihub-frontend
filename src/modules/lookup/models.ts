import z from 'zod';

export const LookupCreateSchema = z.object({
    type: z.string().min(1),
    label: z.string().min(1),
});

export type LookupCreateRequest = z.infer<typeof LookupCreateSchema>;

export const LookupUpdateSchema = z.object({
    id: z.ulid(),
    type: z.string().min(1),
    label: z.string().min(1),
});

export type LookupUpdateRequest = z.infer<typeof LookupUpdateSchema>;

export enum LookupType {
    PROFESSIONAL_ROLE,
}
