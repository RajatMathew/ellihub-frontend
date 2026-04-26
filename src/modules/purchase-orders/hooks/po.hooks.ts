import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { toastApiError } from '@app/lib/toast-api-error';
import { poApi } from '../api/po.api';
import { poKeys } from '../constants/po.keys';
import type { CreatePOInput, ListPOsParams, POLineItemInput } from '../schemas/po.schema';

/* ---- queries ---- */

export const usePOsQuery = (params?: ListPOsParams) =>
  useQuery({
    queryKey: [...poKeys.list(), params],
    queryFn: () => poApi.list(params),
  });

export const usePODetailQuery = (id: string) =>
  useQuery({
    queryKey: poKeys.detail(id),
    queryFn: () => poApi.get(id),
    enabled: !!id,
  });

/* ---- mutations ---- */

export const useCreatePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePOInput) => poApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.all });
    },
    onError: (err) => toastApiError(err, 'Failed to create purchase order.'),
  });
};

export const useUpdatePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePOInput> }) =>
      poApi.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: poKeys.list() });
      qc.invalidateQueries({ queryKey: poKeys.detail(updated.id) });
    },
    onError: (err) => toastApiError(err, 'Failed to update purchase order.'),
  });
};

export const useIssuePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emailVendor }: { id: string; emailVendor?: boolean }) =>
      poApi.issue(id, { emailVendor }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: poKeys.detail(id) });
      qc.invalidateQueries({ queryKey: poKeys.list() });
    },
    onError: (err) => toastApiError(err, 'Failed to issue purchase order.'),
  });
};

export const useCancelPOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      reason: string;
      notifyVendor?: boolean;
      confirmInvoices?: boolean;
      confirmSCOs?: boolean;
    }) => poApi.cancel(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: poKeys.detail(id) });
      qc.invalidateQueries({ queryKey: poKeys.list() });
    },
    onError: (err) => toastApiError(err, 'Failed to cancel purchase order.'),
  });
};

export const useRecordDeliveryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      deliveryDate: string;
      notes?: string;
    }) => poApi.recordDelivery(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: poKeys.detail(id) });
    },
    onError: (err) => toastApiError(err, 'Failed to record delivery.'),
  });
};

export const useRevertToDraftMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => poApi.revertToDraft(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: poKeys.detail(id) });
      qc.invalidateQueries({ queryKey: poKeys.list() });
      toast.success('Purchase order reverted to draft.');
    },
    onError: (err) => toastApiError(err, 'Failed to revert to draft.'),
  });
};

/* ---- line item mutations ---- */

export const useAddPOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: POLineItemInput }) =>
      poApi.addLineItem(poId, data),
    onSuccess: (_, { poId }) => {
      qc.invalidateQueries({ queryKey: poKeys.detail(poId) });
    },
    onError: (err) => toastApiError(err, 'Failed to add line item.'),
  });
};

export const useRemovePOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, lineItemId }: { poId: string; lineItemId: string }) =>
      poApi.removeLineItem(poId, lineItemId),
    onSuccess: (_, { poId }) => {
      qc.invalidateQueries({ queryKey: poKeys.detail(poId) });
    },
    onError: (err) => toastApiError(err, 'Failed to remove line item.'),
  });
};
