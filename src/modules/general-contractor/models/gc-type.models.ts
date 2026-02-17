import z from 'zod';

export const GCTypeCreateSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    description: z.string().optional(),
});

export type GCTypeCreateRequest = z.infer<typeof GCTypeCreateSchema>;

export const GCTypeUpdateSchema = z
    .object({
        name: z.string().min(1),
        code: z.string().min(1),
        description: z.string().nullable(),
    })
    .partial();

export type GCTypeUpdateRequest = z.infer<typeof GCTypeUpdateSchema>;
