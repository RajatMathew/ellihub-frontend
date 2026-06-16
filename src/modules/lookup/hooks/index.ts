import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { toastApiError } from '@/app/lib/toast-api-error';
import { lookupApi } from '@/modules/lookup/api/lookup.api';
import { lookupKeys } from '@/modules/lookup/constants/lookup.keys';
import {
  lookupCreateSchema,
  lookupUpdateSchema,
  type Lookup,
  type LookupCreate,
  type LookupUpdate,
} from '@/modules/lookup/schemas/lookup.schema';

/* ---- queries ---- */
export const useLookupsQuery = (type?: string) =>
  useQuery({
    queryKey: lookupKeys.list(type),
    queryFn: () => (type ? lookupApi.listByType(type) : lookupApi.listAll()),
  });

export const useLookupDetailQuery = (id: string) =>
  useQuery({
    queryKey: lookupKeys.detail(id),
    queryFn: () => lookupApi.get(id),
    enabled: Boolean(id),
  });

/* ---- mutations ---- */
export const useCreateLookupMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: lookupApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lookupKeys.all });
      toast.success('Lookup created successfully.');
    },
    onError: (error) => toastApiError(error, 'Failed to create lookup.'),
  });
};

export const useUpdateLookupMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: lookupApi.update,
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: lookupKeys.all });
      qc.invalidateQueries({ queryKey: lookupKeys.detail(data.id) });
      toast.success('Lookup updated successfully.');
    },
    onError: (error) => toastApiError(error, 'Failed to update lookup.'),
  });
};

export const useDeleteLookupMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: lookupApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: lookupKeys.all });
      toast.success('Lookup deleted successfully.');
    },
    onError: (error) => toastApiError(error, 'Failed to delete lookup.'),
  });
};

/* ---- form hooks ---- */
export const useLookupForm = (defaults?: Partial<Lookup> | Partial<LookupCreate>) =>
  useForm<LookupCreate | LookupUpdate>({
    resolver: zodResolver(
      defaults && 'id' in defaults && defaults.id != null ? lookupUpdateSchema : lookupCreateSchema
    ),
    defaultValues: defaults as Partial<LookupCreate & LookupUpdate>,
  });
