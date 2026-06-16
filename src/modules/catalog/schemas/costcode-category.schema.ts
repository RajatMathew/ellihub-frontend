import { z } from 'zod';

export const costCodeCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  tenantId: z.string().optional(),
  deletedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CostCodeCategory = z.infer<typeof costCodeCategorySchema>;

export const costCodeCategoryListSchema = z.array(costCodeCategorySchema);

export const costCodeCategoryCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().nullable().optional(),
});

export type CostCodeCategoryCreate = z.infer<typeof costCodeCategoryCreateSchema>;

export const costCodeCategoryUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().nullable().optional(),
});

export type CostCodeCategoryUpdate = z.infer<typeof costCodeCategoryUpdateSchema>;
