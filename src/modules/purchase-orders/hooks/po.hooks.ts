import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { poApi } from '../api/po.api';
import { poKeys } from '../constants/po.keys';
import type { CreatePOInput, ListPOsParams } from '../schemas/po.schema';

/* ---- queries ---- */

export const usePOsQuery = (params?: ListPOsParams) =>
  useQuery({
    queryKey: [...poKeys.list(), params],
    queryFn: () => poApi.list(params),
  });

/* ---- mutations ---- */

export const useCreatePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePOInput) => poApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all });
    },
    onError: () => toast.error('Failed to create purchase order.'),
  });
};

export const useDeletePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => poApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all });
    },
    onError: () => toast.error('Failed to delete purchase order.'),
  });
};
