import z from 'zod';

export const POStatusCreateSchema = z.object({
    name: z.string().min(1).max(50),
    label: z.string().min(1).max(100),
    color: z.string().min(1).max(50),
    order: z.number().int().positive(),
    isDefault: z.boolean().optional(),
});

export type POStatusCreateRequest = z.infer<typeof POStatusCreateSchema>;

export const POStatusUpdateSchema = z
    .object({
        name: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        color: z.string().min(1).max(50),
        order: z.number().int().positive(),
        isDefault: z.boolean(),
    })
    .partial();

export type POStatusUpdateRequest = z.infer<typeof POStatusUpdateSchema>;
