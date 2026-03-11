import z from 'zod';

export const PCOChangeTypeCreateSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(50),
    description: z.string().optional(),
    color: z.string().min(1).max(50),
    order: z.number().int().positive(),
});

export type PCOChangeTypeCreateRequest = z.infer<typeof PCOChangeTypeCreateSchema>;

export const PCOChangeTypeUpdateSchema = z
    .object({
        name: z.string().min(1).max(100),
        code: z.string().min(1).max(50),
        description: z.string().nullable(),
        color: z.string().min(1).max(50),
        order: z.number().int().positive(),
    })
    .partial();

export type PCOChangeTypeUpdateRequest = z.infer<typeof PCOChangeTypeUpdateSchema>;
