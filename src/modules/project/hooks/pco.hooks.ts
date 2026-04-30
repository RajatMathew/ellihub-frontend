import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toastApiError } from '@app/lib/toast-api-error';
import { pcoKeys } from '@modules/project/constants/pco.keys';
import type {
  CreatePCOInput,
  ListPCOParams,
  PCOApproveResponse,
  PCOChangeType,
  PCODetail,
  PCOFinancialImpact,
  PCOLineItemInput,
  PCOPaginatedResponse,
  PCOPipeline,
  PCORejectInput,
  PCOStatus,
  PCOVoidInput,
  UpdatePCOInput,
} from '@modules/project/schemas/pco.schema';

const removedLegacyPcoApi = async <T>(): Promise<T> => {
  throw new Error('Legacy PCO API has been replaced by Prime Change Order Fieldwire sync.');
};

/* ---- legacy queries retained for unrouted PCO screens ---- */

export const usePCOListQuery = (params: ListPCOParams) =>
  useQuery<PCOPaginatedResponse>({
    queryKey: [...pcoKeys.list(params.projectId), params],
    queryFn: () => removedLegacyPcoApi<PCOPaginatedResponse>(),
    enabled: false,
  });

export const usePCOPipelineQuery = (projectId: string) =>
  useQuery<PCOPipeline>({
    queryKey: pcoKeys.pipeline(projectId),
    queryFn: () => removedLegacyPcoApi<PCOPipeline>(),
    enabled: false,
  });

export const usePCODetailQuery = (id: string) =>
  useQuery<PCODetail>({
    queryKey: pcoKeys.detail(id),
    queryFn: () => removedLegacyPcoApi<PCODetail>(),
    enabled: false,
  });

export const usePCOStatusesQuery = () =>
  useQuery<PCOStatus[]>({
    queryKey: pcoKeys.statuses(),
    queryFn: () => removedLegacyPcoApi<PCOStatus[]>(),
    enabled: false,
  });

export const usePCOChangeTypesQuery = () =>
  useQuery<PCOChangeType[]>({
    queryKey: pcoKeys.changeTypes(),
    queryFn: () => removedLegacyPcoApi<PCOChangeType[]>(),
    enabled: false,
  });

export const usePCOFinancialImpactQuery = (id: string) =>
  useQuery<PCOFinancialImpact>({
    queryKey: pcoKeys.financialImpact(id),
    queryFn: () => removedLegacyPcoApi<PCOFinancialImpact>(),
    enabled: false,
  });

/* ---- legacy mutations retained for unrouted PCO screens ---- */

export const useCreatePCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_data: CreatePCOInput) => removedLegacyPcoApi<PCODetail>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pcoKeys.all });
      toast.success('Change order created.');
    },
    onError: (err) => toastApiError(err, 'Failed to create change order.'),
  });
};

export const useUpdatePCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_request: { id: string; data: UpdatePCOInput }) =>
      removedLegacyPcoApi<PCODetail>(),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.all });
      qc.invalidateQueries({ queryKey: pcoKeys.detail(id) });
      toast.success('Change order updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update change order.'),
  });
};

export const useDeletePCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_id: string) => removedLegacyPcoApi<void>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pcoKeys.all });
      toast.success('Change order deleted.');
    },
    onError: (err) => toastApiError(err, 'Failed to delete change order.'),
  });
};

export const useApprovePCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_id: string) => removedLegacyPcoApi<PCOApproveResponse>(),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: pcoKeys.all });
      qc.invalidateQueries({ queryKey: pcoKeys.detail(id) });
      toast.success('Change order approved.');
    },
    onError: (err) => toastApiError(err, 'Failed to approve change order.'),
  });
};

export const useRejectPCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_request: { id: string; data: PCORejectInput }) =>
      removedLegacyPcoApi<PCODetail>(),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.all });
      qc.invalidateQueries({ queryKey: pcoKeys.detail(id) });
      toast.success('Change order rejected.');
    },
    onError: (err) => toastApiError(err, 'Failed to reject change order.'),
  });
};

export const useVoidPCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_request: { id: string; data: PCOVoidInput }) =>
      removedLegacyPcoApi<PCODetail>(),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.all });
      qc.invalidateQueries({ queryKey: pcoKeys.detail(id) });
      toast.success('Change order voided.');
    },
    onError: (err) => toastApiError(err, 'Failed to void change order.'),
  });
};

export const useTransitionPCOStatusMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_request: {
      id: string;
      data: { status: string; reason?: string; onBehalfOf?: string };
    }) => removedLegacyPcoApi<PCODetail>(),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.all });
      qc.invalidateQueries({ queryKey: pcoKeys.detail(id) });
    },
    onError: (err) => toastApiError(err, 'Failed to transition status.'),
  });
};

export const useAddPCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_request: { pcoId: string; data: PCOLineItemInput }) =>
      removedLegacyPcoApi<unknown>(),
    onSuccess: (_, { pcoId }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.detail(pcoId) });
    },
    onError: (err) => toastApiError(err, 'Failed to add line item.'),
  });
};

export const useUpdatePCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_request: {
      pcoId: string;
      lineItemId: string;
      data: PCOLineItemInput;
    }) => removedLegacyPcoApi<unknown>(),
    onSuccess: (_, { pcoId }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.detail(pcoId) });
    },
    onError: (err) => toastApiError(err, 'Failed to update line item.'),
  });
};

export const useRemovePCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (_request: { pcoId: string; lineItemId: string }) =>
      removedLegacyPcoApi<void>(),
    onSuccess: (_, { pcoId }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.detail(pcoId) });
    },
    onError: (err) => toastApiError(err, 'Failed to remove line item.'),
  });
};
