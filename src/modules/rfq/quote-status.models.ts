import z from 'zod';

export const QuoteStatusCreateSchema = z.object({
    name: z.string().min(1).max(50),
    label: z.string().min(1).max(100),
    color: z.string().min(1).max(50),
    order: z.number().int().positive(),
    isDefault: z.boolean().optional(),
});

export type QuoteStatusCreateRequest = z.infer<typeof QuoteStatusCreateSchema>;

export const QuoteStatusUpdateSchema = z
    .object({
        name: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        color: z.string().min(1).max(50),
        order: z.number().int().positive(),
        isDefault: z.boolean(),
    })
    .partial();

export type QuoteStatusUpdateRequest = z.infer<typeof QuoteStatusUpdateSchema>;
