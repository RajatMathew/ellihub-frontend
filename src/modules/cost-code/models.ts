import z from 'zod';

export const CostCodeCategoryCreateSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional().nullable(),
});

export type CostCodeCategoryCreateRequest = z.infer<typeof CostCodeCategoryCreateSchema>;

export const CostCodeCategoryUpdateSchema = CostCodeCategoryCreateSchema.extend({
    id: z.uuid(),
});

export type CostCodeCategoryUpdateRequest = z.infer<typeof CostCodeCategoryUpdateSchema>;

export const CostCodeCreateSchema = z.object({
    name: z.string().min(2),
    code: z.string().min(2),
    costCodeCategoryId: z.ulid(),
    description: z.string().optional().nullable(),
});

export type CostCodeCreateRequest = z.infer<typeof CostCodeCreateSchema>;

export const CostCodeUpdateSchema = CostCodeCreateSchema.extend({
    id: z.uuid(),
});

export type CostCodeUpdateRequest = z.infer<typeof CostCodeUpdateSchema>;
