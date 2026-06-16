import { toastApiError } from '@/app/lib/toast-api-error';
import { ptoApi } from '@/modules/hr/api/pto.api';
import { ptoKeys } from '@/modules/hr/constants/pto.keys';
import type {
  CreatePTOInput,
  ListPTOParams,
  PTODecisionInput,
  UpdatePTOInput,
} from '@/modules/hr/schemas/pto.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const usePTOListQuery = (params: ListPTOParams) =>
  useQuery({
    queryKey: ptoKeys.list(params),
    queryFn: () => ptoApi.list(params),
  });

export const usePTOStatsQuery = () =>
  useQuery({
    queryKey: ptoKeys.stats(),
    queryFn: () => ptoApi.stats(),
  });

export const usePTODetailQuery = (id: string) =>
  useQuery({
    queryKey: ptoKeys.detail(id),
    queryFn: () => ptoApi.getById(id),
    enabled: !!id,
  });

export const useCreatePTOMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePTOInput) => ptoApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ptoKeys.all });
      toast.success('Time off request submitted');
    },
    onError: (error) => toastApiError(error, 'Failed to submit request'),
  });
};

export const useUpdatePTOMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePTOInput) => ptoApi.update(data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ptoKeys.all });
      void queryClient.invalidateQueries({ queryKey: ptoKeys.detail(data.id) });
      toast.success('Time off request updated');
    },
    onError: (error) => toastApiError(error, 'Failed to update request'),
  });
};

export const useDeletePTOMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ptoApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ptoKeys.all });
      toast.success('Time off request deleted');
    },
    onError: (error) => toastApiError(error, 'Failed to delete request'),
  });
};

export const useApprovePTOMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PTODecisionInput) => ptoApi.approve(data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ptoKeys.all });
      void queryClient.invalidateQueries({ queryKey: ptoKeys.detail(variables.id) });
      toast.success('Request approved');
    },
    onError: (error) => toastApiError(error, 'Failed to approve request'),
  });
};

export const useRejectPTOMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PTODecisionInput) => ptoApi.reject(data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ptoKeys.all });
      void queryClient.invalidateQueries({ queryKey: ptoKeys.detail(variables.id) });
      toast.success('Request rejected');
    },
    onError: (error) => toastApiError(error, 'Failed to reject request'),
  });
};
