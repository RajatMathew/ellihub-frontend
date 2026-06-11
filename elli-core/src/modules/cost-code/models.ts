import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const CostCodeCategoryCreateSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional().nullable(),
});

export type CostCodeCategoryCreateRequest = z.infer<typeof CostCodeCategoryCreateSchema>;

export const CostCodeCategoryUpdateSchema = CostCodeCategoryCreateSchema.partial().extend({
    id: nanoIdSchema,
});

export type CostCodeCategoryUpdateRequest = z.infer<typeof CostCodeCategoryUpdateSchema>;

export const CostCodeCreateSchema = z.object({
    name: z.string().min(2),
    code: z.string().min(2),
    costCodeCategoryId: nanoIdSchema,
    description: z.string().min(1),
});

export type CostCodeCreateRequest = z.infer<typeof CostCodeCreateSchema>;

export const CostCodeUpdateSchema = CostCodeCreateSchema.partial().extend({ id: nanoIdSchema });

export type CostCodeUpdateRequest = z.infer<typeof CostCodeUpdateSchema>;

export const CostCodeQuerySchema = z.object({
    search: z.string().optional(),
    costCodeCategoryId: nanoIdSchema.optional(),
    page: z.coerce.number().int().positive().optional(),
    size: z.coerce.number().int().positive().max(100).optional(),
    sortBy: z.enum(['code', 'name', 'createdAt', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CostCodeQueryParams = z.infer<typeof CostCodeQuerySchema>;
