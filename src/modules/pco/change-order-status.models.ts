import z from 'zod';

export const ChangeOrderStatusCreateSchema = z.object({
    name: z.string().min(1).max(50),
    label: z.string().min(1).max(100),
    color: z.string().min(1).max(50),
    order: z.number().int().positive(),
});

export type ChangeOrderStatusCreateRequest = z.infer<typeof ChangeOrderStatusCreateSchema>;

export const ChangeOrderStatusUpdateSchema = z
    .object({
        name: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        color: z.string().min(1).max(50),
        order: z.number().int().positive(),
    })
    .partial();

export type ChangeOrderStatusUpdateRequest = z.infer<typeof ChangeOrderStatusUpdateSchema>;
