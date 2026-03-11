import z from 'zod';

export const AddendumChangeTypeCreateSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(50),
    description: z.string().optional(),
    color: z.string().min(1).max(50),
    order: z.number().int().positive(),
});

export type AddendumChangeTypeCreateRequest = z.infer<typeof AddendumChangeTypeCreateSchema>;

export const AddendumChangeTypeUpdateSchema = z
    .object({
        name: z.string().min(1).max(100),
        code: z.string().min(1).max(50),
        description: z.string().nullable(),
        color: z.string().min(1).max(50),
        order: z.number().int().positive(),
    })
    .partial();

export type AddendumChangeTypeUpdateRequest = z.infer<typeof AddendumChangeTypeUpdateSchema>;
