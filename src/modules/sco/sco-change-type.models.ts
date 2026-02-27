import z from 'zod';

export const SCOChangeTypeCreateSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(50),
    description: z.string().optional(),
    color: z.string().min(1).max(50),
    order: z.number().int().positive(),
});

export type SCOChangeTypeCreateRequest = z.infer<typeof SCOChangeTypeCreateSchema>;

export const SCOChangeTypeUpdateSchema = z
    .object({
        name: z.string().min(1).max(100),
        code: z.string().min(1).max(50),
        description: z.string().nullable(),
        color: z.string().min(1).max(50),
        order: z.number().int().positive(),
    })
    .partial();

export type SCOChangeTypeUpdateRequest = z.infer<typeof SCOChangeTypeUpdateSchema>;
