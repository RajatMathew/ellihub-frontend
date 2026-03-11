import z from 'zod';

export const InvoiceStatusCreateSchema = z.object({
    name: z.string().min(1).max(50),
    label: z.string().min(1).max(100),
    color: z.string().min(1).max(50),
    order: z.number().int().positive(),
    isDefault: z.boolean().optional(),
});

export type InvoiceStatusCreateRequest = z.infer<typeof InvoiceStatusCreateSchema>;

export const InvoiceStatusUpdateSchema = z
    .object({
        name: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        color: z.string().min(1).max(50),
        order: z.number().int().positive(),
        isDefault: z.boolean(),
    })
    .partial();

export type InvoiceStatusUpdateRequest = z.infer<typeof InvoiceStatusUpdateSchema>;
