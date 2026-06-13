import type { CostCodeFilters } from '@/modules/catalog/schemas/costcode.schema';

export const costCodesKeys = {
  all: ['cost-codes'] as const,
  list: () => [...costCodesKeys.all, 'list'] as const,
  count: (filters?: Pick<CostCodeFilters, 'costCodeCategoryId' | 'search'>) =>
    [...costCodesKeys.all, 'count', filters ?? {}] as const,
  detail: (id: string) => [...costCodesKeys.all, id] as const,
};
