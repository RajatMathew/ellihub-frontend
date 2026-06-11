import { toastApiError } from '@/app/lib/toast-api-error';
import { gcApi } from '@/modules/directory/api/gc.api';
import { gcKeys } from '@/modules/directory/constants/gc.keys';
import type {
  AddGCContactLinkInput,
  CreateGCInput,
  ListGCsParams,
  UpdateGCInput,
} from '@/modules/directory/schemas/gc.schema';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* ---- queries ---- */

export const useGCsQuery = (params?: ListGCsParams) =>
  useQuery({
    queryKey: [...gcKeys.list(), params],
    queryFn: () => gcApi.list(params),
  });

export const useGCDetailQuery = (id: string) =>
  useQuery({
    queryKey: gcKeys.detail(id),
    queryFn: () => gcApi.getById(id),
    enabled: !!id,
  });

export const useGCStatsQuery = () =>
  useQuery({
    queryKey: gcKeys.stats(),
    queryFn: () => gcApi.getStats(),
  });

export const useGCTypesQuery = () =>
  useQuery({
    queryKey: gcKeys.types(),
    queryFn: () => gcApi.getTypes(),
  });

/* ---- mutations ---- */

export const useCreateGCMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGCInput) => gcApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to create general contractor.'),
  });
};

export const useUpdateGCMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGCInput }) => gcApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
      qc.invalidateQueries({ queryKey: gcKeys.detail(id) });
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to update general contractor.'),
  });
};

export const useDeleteGCMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gcApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to delete general contractor.'),
  });
};

/* ---- contact link mutations ---- */

export const useAddGCContactLinkMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gcId, data }: { gcId: string; data: AddGCContactLinkInput }) =>
      gcApi.addContactLink(gcId, data),
    onSuccess: (_, { gcId }) => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
      qc.invalidateQueries({ queryKey: gcKeys.detail(gcId) });
    },
    onError: (error) => toastApiError(error, 'Failed to add contact link.'),
  });
};

export const useRemoveGCContactLinkMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ gcId, contactId }: { gcId: string; contactId: string }) =>
      gcApi.removeContactLink(gcId, contactId),
    onSuccess: (_, { gcId }) => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
      qc.invalidateQueries({ queryKey: gcKeys.detail(gcId) });
    },
    onError: (error) => toastApiError(error, 'Failed to remove contact link.'),
  });
};
