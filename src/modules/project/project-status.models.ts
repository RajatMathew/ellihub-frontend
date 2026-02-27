import z from 'zod';

export const ProjectStatusCreateSchema = z.object({
    name: z.string().min(1).max(50),
    label: z.string().min(1).max(100),
    color: z.string().min(1).max(50),
    order: z.number().int().positive(),
    isDefault: z.boolean().optional(),
});

export type ProjectStatusCreateRequest = z.infer<typeof ProjectStatusCreateSchema>;

export const ProjectStatusUpdateSchema = z
    .object({
        name: z.string().min(1).max(50),
        label: z.string().min(1).max(100),
        color: z.string().min(1).max(50),
        order: z.number().int().positive(),
        isDefault: z.boolean(),
    })
    .partial();

export type ProjectStatusUpdateRequest = z.infer<typeof ProjectStatusUpdateSchema>;
