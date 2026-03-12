import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { projectApi } from '@modules/project/api/project.api';
import { projectKeys } from '@modules/project/constants/project.keys';
import type {
  CreateProjectInput,
  ListProjectsParams,
  ProjectDetail,
  UpdateProjectInput,
} from '@modules/project/schemas/project.schema';

/* ---- QUERY HOOKS ---- */

export const useProjectsQuery = (params?: ListProjectsParams) =>
  useQuery({
    queryKey: [...projectKeys.list(), params],
    queryFn: () => projectApi.list(params),
  });

export const useProjectDetailQuery = (id: string) =>
  useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectApi.getById(id),
    enabled: !!id,
  });

export const useInvoiceAgingQuery = (
  id: string,
  params?: { asOfDate?: string; vendorId?: string },
) =>
  useQuery({
    queryKey: [...projectKeys.invoiceAging(id), params],
    queryFn: () => projectApi.getInvoiceAging(id, params),
    enabled: !!id,
  });

export const useInvoiceSummaryQuery = (id: string) =>
  useQuery({
    queryKey: projectKeys.invoiceSummary(id),
    queryFn: () => projectApi.getInvoiceSummary(id),
    enabled: !!id,
  });

/* ---- MUTATION HOOKS ---- */

export const useCreateProjectMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
    },
    onError: () => toast.error('Failed to create project.'),
  });
};

export const useUpdateProjectMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      projectApi.update(id, data),
    onSuccess: (updated: ProjectDetail) => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      qc.invalidateQueries({ queryKey: projectKeys.detail(updated.id) });
    },
    onError: () => toast.error('Failed to update project.'),
  });
};

export const useDeleteProjectMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
    },
    onError: () => toast.error('Failed to delete project.'),
  });
};
