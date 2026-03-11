import z from 'zod';

export const RFQStatusCreateSchema = z.object({
    name: z.string().min(1).max(50),
    label: z.string().min(1).max(100),
    color: z.string().min(1).max(50),
    order: z.number().int().positive(),
    isDefault: z.boolean().optional(),
});

export type RFQStatusCreateRequest = z.infer<typeof RFQStatusCreateSchema>;

export const RFQStatusUpdateSchema = z
    .object({
        name: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        color: z.string().min(1).max(50),
        order: z.number().int().positive(),
        isDefault: z.boolean(),
    })
    .partial();

export type RFQStatusUpdateRequest = z.infer<typeof RFQStatusUpdateSchema>;
