import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ptoApi } from '../api/pto.api';
import type {
  CreatePTOInput,
  UpdatePTOInput,
  PTODecisionInput,
} from '../schemas/pto.schema';

export const ptoKeys = {
  all: ['pto'] as const,
  lists: () => [...ptoKeys.all, 'list'] as const,
  list: (params: any) => [...ptoKeys.lists(), params] as const,
  details: () => [...ptoKeys.all, 'detail'] as const,
  detail: (id: string) => [...ptoKeys.details(), id] as const,
};

export const usePTOListQuery = (params: { page?: number; size?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; search?: string }) =>
  useQuery({
    queryKey: ptoKeys.list(params),
    queryFn: () => ptoApi.list(params),
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
      queryClient.invalidateQueries({ queryKey: ptoKeys.lists() });
      toast.success('Time off request submitted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to submit request');
    },
  });
};

export const useUpdatePTOMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePTOInput) => ptoApi.update(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ptoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ptoKeys.detail(data.id) });
      toast.success('Time off request updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update request');
    },
  });
};

export const useDeletePTOMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ptoApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ptoKeys.lists() });
      toast.success('Time off request deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete request');
    },
  });
};

export const useApprovePTOMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PTODecisionInput) => ptoApi.approve(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ptoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ptoKeys.detail(variables.id) });
      toast.success('Request approved');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve request');
    },
  });
};

export const useRejectPTOMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PTODecisionInput) => ptoApi.reject(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ptoKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ptoKeys.detail(variables.id) });
      toast.success('Request rejected');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject request');
    },
  });
};
