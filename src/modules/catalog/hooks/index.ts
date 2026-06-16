import { toastApiError } from '@/app/lib/toast-api-error';
import { costCodeCategoriesApi } from '@/modules/catalog/api/costcode-categories.api';
import { costCodesApi } from '@/modules/catalog/api/costcodes.api';
import { costCodeCategoriesKeys } from '@/modules/catalog/constants/costcode-categories.keys';
import { costCodesKeys } from '@/modules/catalog/constants/costcodes.keys';
import type {
  CostCodeCategoryCreate,
  CostCodeCategoryUpdate,
} from '@/modules/catalog/schemas/costcode-category.schema';
import {
  costCodeCreateSchema,
  costCodeSchema,
  type CostCode,
  type CostCodeCreate,
  type CostCodeFilters,
} from '@/modules/catalog/schemas/costcode.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

/* ---- category queries ---- */
export const useCostCodeCategoriesQuery = () =>
  useQuery({
    queryKey: costCodeCategoriesKeys.list(),
    queryFn: () => costCodeCategoriesApi.list(),
  });

/* ---- category mutations ---- */
export const useCreateCostCodeCategoryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: costCodeCategoriesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: costCodeCategoriesKeys.all }),
    onError: (error) => toastApiError(error, 'Failed to create category.'),
  });
};

export const useUpdateCostCodeCategoryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: costCodeCategoriesApi.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: costCodeCategoriesKeys.all }),
    onError: (error) => toastApiError(error, 'Failed to update category.'),
  });
};

export const useDeleteCostCodeCategoryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: costCodeCategoriesApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costCodeCategoriesKeys.all });
      qc.invalidateQueries({ queryKey: costCodesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to delete category.'),
  });
};

/* ---- cost code queries ---- */
export const useCostCodesQuery = (filters?: CostCodeFilters) =>
  useQuery({
    queryKey: [...costCodesKeys.list(), filters],
    queryFn: () => costCodesApi.list(filters),
  });

export const useCostCodeStatsQuery = () =>
  useQuery({
    queryKey: costCodesKeys.stats(),
    queryFn: () => costCodesApi.stats(),
  });

/* ---- cost code mutations ---- */
export const useCreateCostCodeMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: costCodesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: costCodesKeys.all }),
    onError: (error) => toastApiError(error, 'Failed to create cost code. Please try again.'),
  });
};

export const useUpdateCostCodeMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: costCodesApi.update,
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: costCodesKeys.all });
      qc.invalidateQueries({ queryKey: costCodesKeys.detail(data.id) });
      toast.success('Cost code updated successfully.');
    },
    onError: (error) => toastApiError(error, 'Failed to update cost code. Please try again.'),
  });
};

export const useDeleteCostCodeMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: costCodesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: costCodesKeys.all }),
    onError: (error) => toastApiError(error, 'Failed to delete cost code. Please try again.'),
  });
};

/* ---- form hooks ---- */
export const useCostCodeForm = (defaults?: Partial<CostCode> | Partial<CostCodeCreate>) =>
  useForm<CostCodeCreate | CostCode>({
    resolver: zodResolver(
      defaults && 'id' in defaults && defaults.id != null ? costCodeSchema : costCodeCreateSchema
    ),
    defaultValues: defaults as Partial<CostCodeCreate & CostCode>,
  });

export type { CostCodeCategoryCreate, CostCodeCategoryUpdate };
