import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toastApiError } from '@app/lib/toast-api-error';
import { pcoApi } from '@modules/project/api/pco.api';
import { pcoKeys } from '@modules/project/constants/pco.keys';
import type {
  ListPCOParams,
  CreatePCOInput,
  UpdatePCOInput,
  PCORejectInput,
  PCOVoidInput,
  PCOLineItemInput,
} from '@modules/project/schemas/pco.schema';

/* ---- queries ---- */

export const usePCOListQuery = (params: ListPCOParams) =>
  useQuery({
    queryKey: [...pcoKeys.list(params.projectId), params],
    queryFn: () => pcoApi.list(params),
    enabled: !!params.projectId,
  });

export const usePCOPipelineQuery = (projectId: string) =>
  useQuery({
    queryKey: pcoKeys.pipeline(projectId),
    queryFn: () => pcoApi.pipeline(projectId),
    enabled: !!projectId,
  });

export const usePCODetailQuery = (id: string) =>
  useQuery({
    queryKey: pcoKeys.detail(id),
    queryFn: () => pcoApi.getById(id),
    enabled: !!id,
  });

export const usePCOStatusesQuery = () =>
  useQuery({
    queryKey: pcoKeys.statuses(),
    queryFn: () => pcoApi.listStatuses(),
  });

export const usePCOChangeTypesQuery = () =>
  useQuery({
    queryKey: pcoKeys.changeTypes(),
    queryFn: () => pcoApi.listChangeTypes(),
  });

export const usePCOFinancialImpactQuery = (id: string) =>
  useQuery({
    queryKey: pcoKeys.financialImpact(id),
    queryFn: () => pcoApi.getFinancialImpact(id),
    enabled: !!id,
  });

/* ---- CRUD mutations ---- */

export const useCreatePCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePCOInput) => pcoApi.create(data),
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
    mutationFn: ({ id, data }: { id: string; data: UpdatePCOInput }) => pcoApi.update(id, data),
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
    mutationFn: (id: string) => pcoApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pcoKeys.all });
      toast.success('Change order deleted.');
    },
    onError: (err) => toastApiError(err, 'Failed to delete change order.'),
  });
};

/* ---- workflow mutations ---- */

export const useApprovePCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pcoApi.approve(id),
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
    mutationFn: ({ id, data }: { id: string; data: PCORejectInput }) => pcoApi.reject(id, data),
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
    mutationFn: ({ id, data }: { id: string; data: PCOVoidInput }) => pcoApi.voidPCO(id, data),
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
    mutationFn: ({ id, data }: { id: string; data: { status: string; reason?: string; onBehalfOf?: string } }) =>
      pcoApi.transitionStatus(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.all });
      qc.invalidateQueries({ queryKey: pcoKeys.detail(id) });
    },
    onError: (err) => toastApiError(err, 'Failed to transition status.'),
  });
};

/* ---- line item mutations ---- */

export const useAddPCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pcoId, data }: { pcoId: string; data: PCOLineItemInput }) =>
      pcoApi.addLineItem(pcoId, data),
    onSuccess: (_, { pcoId }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.detail(pcoId) });
    },
    onError: (err) => toastApiError(err, 'Failed to add line item.'),
  });
};

export const useUpdatePCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pcoId,
      lineItemId,
      data,
    }: {
      pcoId: string;
      lineItemId: string;
      data: PCOLineItemInput;
    }) => pcoApi.updateLineItem(pcoId, lineItemId, data),
    onSuccess: (_, { pcoId }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.detail(pcoId) });
    },
    onError: (err) => toastApiError(err, 'Failed to update line item.'),
  });
};

export const useRemovePCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pcoId, lineItemId }: { pcoId: string; lineItemId: string }) =>
      pcoApi.removeLineItem(pcoId, lineItemId),
    onSuccess: (_, { pcoId }) => {
      qc.invalidateQueries({ queryKey: pcoKeys.detail(pcoId) });
    },
    onError: (err) => toastApiError(err, 'Failed to remove line item.'),
  });
};
