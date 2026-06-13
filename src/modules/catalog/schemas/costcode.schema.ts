import { z } from 'zod';

const costCodeCategoryRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export const costCodeSchema = z.object({
  id: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  tenantId: z.string().optional(),
  description: z.string().nullable().optional(),
  costCodeCategoryId: z.string().min(1, 'Category is required'),
  costCodeCategory: costCodeCategoryRefSchema.optional(),
  deletedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type CostCode = z.infer<typeof costCodeSchema>;

export const costCodeCreateSchema = costCodeSchema.omit({
  id: true,
  tenantId: true,
  costCodeCategory: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type CostCodeCreate = z.infer<typeof costCodeCreateSchema>;

export const costCodeListSchema = z.array(costCodeSchema);

export const costCodePaginatedResponseSchema = z.object({
  data: costCodeListSchema,
  count: z.number(),
});

export type CostCodePaginatedResponse = z.infer<typeof costCodePaginatedResponseSchema>;

export const costCodeStatsCategorySchema = costCodeCategoryRefSchema.extend({
  count: z.number(),
});

export const costCodeStatsSchema = z.object({
  totalCostCodes: z.number(),
  totalCategories: z.number(),
  categories: z.array(costCodeStatsCategorySchema),
});

export type CostCodeStats = z.infer<typeof costCodeStatsSchema>;

export const costCodeFiltersSchema = z.object({
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.enum(['name', 'code']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  costCodeCategoryId: z.string().optional(),
});

export type CostCodeFilters = z.infer<typeof costCodeFiltersSchema>;
