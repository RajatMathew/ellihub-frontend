import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { gcApi } from '@modules/directory/api/gc.api';
import { gcKeys } from '@modules/directory/constants/gc.keys';
import type {
  CreateGCContactInput,
  CreateGCInput,
  ListGCsParams,
  UpdateGCContactInput,
  UpdateGCInput,
} from '@modules/directory/schemas/gc.schema';

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

/* ---- mutations ---- */

export const useCreateGCMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGCInput) => gcApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
    },
    onError: () => toast.error('Failed to create general contractor.'),
  });
};

export const useUpdateGCMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGCInput }) =>
      gcApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
      qc.invalidateQueries({ queryKey: gcKeys.detail(id) });
    },
    onError: () => toast.error('Failed to update general contractor.'),
  });
};

export const useDeleteGCMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gcApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
    },
    onError: () => toast.error('Failed to archive general contractor.'),
  });
};

/* ---- GC contact mutations ---- */

export const useAddGCContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateGCContactInput }) =>
      gcApi.addContact(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
      qc.invalidateQueries({ queryKey: gcKeys.detail(id) });
    },
    onError: () => toast.error('Failed to add GC contact.'),
  });
};

export const useUpdateGCContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      contactId,
      data,
    }: {
      id: string;
      contactId: string;
      data: UpdateGCContactInput;
    }) => gcApi.updateContact(id, contactId, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
      qc.invalidateQueries({ queryKey: gcKeys.detail(id) });
    },
    onError: () => toast.error('Failed to update GC contact.'),
  });
};

export const useDeleteGCContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, contactId }: { id: string; contactId: string }) =>
      gcApi.removeContact(id, contactId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: gcKeys.all });
      qc.invalidateQueries({ queryKey: gcKeys.detail(id) });
    },
    onError: () => toast.error('Failed to remove GC contact.'),
  });
};
