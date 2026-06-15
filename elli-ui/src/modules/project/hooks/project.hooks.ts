import { toastApiError } from '@/app/lib/toast-api-error';
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
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const hasProjectCapabilities = (project: ProjectDetail) =>
  Boolean(
    project.capabilities?.canManage ||
    project.capabilities?.canEdit ||
    project.capabilities?.canCreateProjectDocuments ||
    project.capabilities?.canManageTeam ||
    Object.values(project.capabilities?.actions ?? {}).some((actions) =>
      Object.values(actions ?? {}).some(Boolean)
    )
  );

type ProjectStatusMutationInput = string | { id: string; silent?: boolean };

const getProjectStatusMutationId = (input: ProjectStatusMutationInput) =>
  typeof input === 'string' ? input : input.id;

const isProjectStatusMutationSilent = (input: ProjectStatusMutationInput) =>
  typeof input !== 'string' && input.silent === true;

/* ---- QUERY HOOKS ---- */

export const useProjectsQuery = (params?: ListProjectsParams) =>
  useQuery({
    queryKey: [...projectKeys.list(), params],
    queryFn: () => projectApi.list(params),
  });

export const useInfiniteProjectsQuery = (params?: ListProjectsParams) =>
  useInfiniteQuery({
    queryKey: [...projectKeys.list(), 'infinite', params],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => projectApi.list({ ...params, page: Number(pageParam) }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
  });

export const useProjectStatsQuery = (params?: ListProjectsParams) =>
  useQuery({
    queryKey: [...projectKeys.stats(), params],
    queryFn: () => projectApi.stats(params),
  });

export const useProjectDetailQuery = (id: string) =>
  useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectApi.getById(id),
    enabled: !!id,
  });

export const useFieldwireProjectsQuery = (enabled = true) =>
  useQuery({
    queryKey: projectKeys.fieldwireProjects(),
    queryFn: () => projectApi.listFieldwireProjects(),
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useProjectCostCodesQuery = (id: string) =>
  useQuery({
    queryKey: projectKeys.costCodes(id),
    queryFn: () => projectApi.listProjectCostCodes(id),
    enabled: !!id,
  });

export const useProjectEmployeeOptionsQuery = (id: string, enabled = true) =>
  useQuery({
    queryKey: projectKeys.employeeOptions(id),
    queryFn: () => projectApi.listProjectEmployeeOptions(id),
    enabled: !!id && enabled,
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
    onError: (error) => toastApiError(error, 'Failed to create project.'),
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
        old
          ? {
              ...old,
              ...updated,
              capabilities: hasProjectCapabilities(updated)
                ? updated.capabilities
                : old.capabilities,
            }
          : updated
      );

      await invalidateProjectQueries(qc, [
        projectKeys.list(),
        projectKeys.detail(updated.id),
        primeChangeOrderKeys.all,
      ]);
      toast.success('Project updated successfully.');
    },
    onError: (error) => toastApiError(error, 'Failed to update project.'),
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
    onError: (error) => toastApiError(error, 'Failed to delete project.'),
  });
};

export const useSetProjectActiveMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectStatusMutationInput) =>
      projectApi.setActive(getProjectStatusMutationId(input)),
    onSuccess: (_updated, input) => {
      const id = getProjectStatusMutationId(input);
      if (!id) return;
      return invalidateProjectQueries(qc, [projectKeys.list(), projectKeys.detail(id)]).then(() => {
        if (!isProjectStatusMutationSilent(input)) {
          toast.success('Project is now Active.');
        }
      });
    },
    onError: (error) => toastApiError(error, 'Failed to set project active.'),
  });
};

export const useSetProjectInactiveMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectStatusMutationInput) =>
      projectApi.setInactive(getProjectStatusMutationId(input)),
    onSuccess: (_updated, input) => {
      const id = getProjectStatusMutationId(input);
      if (!id) return;
      return invalidateProjectQueries(qc, [projectKeys.list(), projectKeys.detail(id)]).then(() => {
        if (!isProjectStatusMutationSilent(input)) {
          toast.success('Project is now Inactive.');
        }
      });
    },
    onError: (error) => toastApiError(error, 'Failed to set project inactive.'),
  });
};

export const useSetProjectClosedMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectStatusMutationInput) =>
      projectApi.setClosed(getProjectStatusMutationId(input)),
    onSuccess: (_updated, input) => {
      const id = getProjectStatusMutationId(input);
      if (!id) return;
      return invalidateProjectQueries(qc, [projectKeys.list(), projectKeys.detail(id)]).then(() => {
        if (!isProjectStatusMutationSilent(input)) {
          toast.success('Project closed successfully.');
        }
      });
    },
    onError: (error) => toastApiError(error, 'Failed to close project.'),
  });
};

export const useSetProjectCompletedMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectStatusMutationInput) =>
      projectApi.setCompleted(getProjectStatusMutationId(input)),
    onSuccess: (_updated, input) => {
      const id = getProjectStatusMutationId(input);
      if (!id) return;
      return invalidateProjectQueries(qc, [projectKeys.list(), projectKeys.detail(id)]).then(() => {
        if (!isProjectStatusMutationSilent(input)) {
          toast.success('Project marked as Completed.');
        }
      });
    },
    onError: (error) => toastApiError(error, 'Failed to set project completed.'),
  });
};
