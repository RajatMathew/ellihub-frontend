import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type AxiosError } from 'axios';
import { toast } from 'sonner';

import { scoApi } from '../api/sco.api';
import { scoKeys } from '../constants/sco.keys';
import type { CreateSCOInput, ListSCOsParams, SCOLineItemInput, UpdateSCOInput } from '../schemas/sco.schema';

/* ---- error helper ---- */

function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosErr = error as AxiosError<{
    message?: string;
    details?: { details?: { path?: string[]; message?: string }[] };
  }>;
  const data = axiosErr?.response?.data;
  if (data?.details?.details?.length) {
    const msgs = data.details.details
      .map((d) => {
        const field = d.path?.join('.') ?? '';
        return field ? `${field}: ${d.message}` : d.message;
      })
      .filter(Boolean);
    if (msgs.length) return msgs.join('\n');
  }
  if (data?.message) return data.message;
  return fallback;
}

function toastApiError(error: unknown, fallback: string) {
  toast.error(getApiErrorMessage(error, fallback));
}

/* ---- queries ---- */

export const useSCOsQuery = (params?: ListSCOsParams) =>
  useQuery({
    queryKey: [...scoKeys.list(), params],
    queryFn: () => scoApi.list(params),
    enabled: !!params?.projectId,
  });

export const useSCOSummaryQuery = (projectId: string) =>
  useQuery({
    queryKey: scoKeys.summary(projectId),
    queryFn: () => scoApi.summary(projectId),
    enabled: !!projectId,
  });

export const useSCOChangeTypesQuery = () =>
  useQuery({
    queryKey: scoKeys.changeTypes(),
    queryFn: () => scoApi.getChangeTypes(),
  });

export const useSCODetailQuery = (id: string) =>
  useQuery({
    queryKey: scoKeys.detail(id),
    queryFn: () => scoApi.getById(id),
    enabled: !!id,
  });

export const useSCOsByPurchaseOrderQuery = (poId: string) =>
  useQuery({
    queryKey: scoKeys.byPurchaseOrder(poId),
    queryFn: () => scoApi.listByPurchaseOrder(poId),
    enabled: !!poId,
  });

/* ---- mutations ---- */

export const useCreateSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSCOInput) => scoApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scoKeys.all });
      toast.success('SCO created.');
    },
    onError: (err) => toastApiError(err, 'Failed to create SCO.'),
  });
};

export const useUpdateSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSCOInput }) => scoApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scoKeys.all });
      toast.success('SCO updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update SCO.'),
  });
};

export const useAddSCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scoId, data }: { scoId: string; data: SCOLineItemInput }) =>
      scoApi.addLineItem(scoId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scoKeys.all }),
  });
};

export const useUpdateSCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scoId,
      lineItemId,
      data,
    }: {
      scoId: string;
      lineItemId: string;
      data: SCOLineItemInput;
    }) => scoApi.updateLineItem(scoId, lineItemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scoKeys.all }),
  });
};

export const useRemoveSCOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scoId, lineItemId }: { scoId: string; lineItemId: string }) =>
      scoApi.removeLineItem(scoId, lineItemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: scoKeys.all }),
  });
};

/* ---- workflow mutations ---- */

export const useApproveSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scoApi.approve(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: scoKeys.all });
      qc.invalidateQueries({ queryKey: scoKeys.detail(id) });
      toast.success('SCO approved.');
    },
    onError: (err) => toastApiError(err, 'Failed to approve SCO.'),
  });
};

export const useRejectSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string } }) =>
      scoApi.reject(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: scoKeys.all });
      qc.invalidateQueries({ queryKey: scoKeys.detail(id) });
      toast.success('SCO rejected.');
    },
    onError: (err) => toastApiError(err, 'Failed to reject SCO.'),
  });
};

export const useVoidSCOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reason: string } }) =>
      scoApi.voidSCO(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: scoKeys.all });
      qc.invalidateQueries({ queryKey: scoKeys.detail(id) });
      toast.success('SCO voided.');
    },
    onError: (err) => toastApiError(err, 'Failed to void SCO.'),
  });
};

export const useRevertSCOToDraftMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scoApi.revertToDraft(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: scoKeys.all });
      qc.invalidateQueries({ queryKey: scoKeys.detail(id) });
      toast.success('SCO reverted to draft.');
    },
    onError: (err) => toastApiError(err, 'Failed to revert SCO to draft.'),
  });
};
