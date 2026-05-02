import { projectApi } from '@/modules/project/api/project.api';
import { primeChangeOrderKeys } from '@/modules/project/constants/prime-change-order';
import { projectKeys } from '@/modules/project/constants/project.keys';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type {
  CreateProjectInput,
  ListProjectsParams,
  ProjectDetail,
  UpdateProjectInput,
} from '@/modules/project/schemas/project.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

export const useFieldwireProjectsQuery = () =>
  useQuery({
    queryKey: projectKeys.fieldwireProjects(),
    queryFn: () => projectApi.listFieldwireProjects(),
    staleTime: 5 * 60 * 1000,
  });

export const useInvoiceAgingQuery = (
  id: string,
  params?: { asOfDate?: string; vendorId?: string }
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
    onSuccess: async (updated: ProjectDetail) => {
      // Merge update into cache to prevent UI flicker/disappearing nested fields.
      qc.setQueryData<ProjectDetail | undefined>(projectKeys.detail(updated.id), (old) =>
        old ? { ...old, ...updated } : updated
      );

      await invalidateProjectQueries(qc, [
        projectKeys.list(),
        projectKeys.detail(updated.id),
        primeChangeOrderKeys.financialSummary(updated.id),
      ]);
      toast.success('Project updated successfully.');
    },
    onError: () => toast.error('Failed to update project.'),
  });
};

export const useDeleteProjectMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectApi.remove(id),
    onSuccess: () => {
      return qc.invalidateQueries({ queryKey: projectKeys.all }).then(() => {
        toast.success('Project deleted successfully.');
      });
    },
    onError: () => toast.error('Failed to delete project.'),
  });
};

export const useSetProjectActiveMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectApi.setActive(id),
    onSuccess: (_updated, id) => {
      if (!id) return;
      return invalidateProjectQueries(qc, [projectKeys.list(), projectKeys.detail(id)]).then(() => {
        toast.success('Project is now Active.');
      });
    },
    onError: () => toast.error('Failed to set project active.'),
  });
};

export const useSetProjectInactiveMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectApi.setInactive(id),
    onSuccess: (_updated, id) => {
      if (!id) return;
      return invalidateProjectQueries(qc, [projectKeys.list(), projectKeys.detail(id)]).then(() => {
        toast.success('Project is now Inactive.');
      });
    },
    onError: () => toast.error('Failed to set project inactive.'),
  });
};

export const useSetProjectClosedMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectApi.setClosed(id),
    onSuccess: (_updated, id) => {
      if (!id) return;
      return invalidateProjectQueries(qc, [projectKeys.list(), projectKeys.detail(id)]).then(() => {
        toast.success('Project closed successfully.');
      });
    },
    onError: () => toast.error('Failed to close project.'),
  });
};

export const useSetProjectCompletedMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectApi.setCompleted(id),
    onSuccess: (_updated, id) => {
      if (!id) return;
      return invalidateProjectQueries(qc, [projectKeys.list(), projectKeys.detail(id)]).then(() => {
        toast.success('Project marked as Completed.');
      });
    },
    onError: () => toast.error('Failed to set project completed.'),
  });
};
