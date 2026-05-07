import { toastApiError } from '@/app/lib/toast-api-error';
import { poApi } from '@/modules/project/api/purchase-order';
import { poKeys } from '@/modules/project/constants/purchase-order';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type {
  AddPOQuickBooksPaymentInput,
  AddPOQuickBooksPaymentsInput,
  CreatePOInput,
  ListPOsParams,
  POLineItemInput,
} from '@/modules/project/schemas/purchase-order';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

function invalidatePOQueries(queryClient: QueryClient, poId?: string) {
  return invalidateProjectQueries(
    queryClient,
    poId ? [poKeys.all, poKeys.detail(poId)] : [poKeys.all]
  );
}

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

export const usePOQuickBooksPaymentsQuery = (id: string) =>
  useQuery({
    queryKey: poKeys.quickBooksPayments(id),
    queryFn: () => poApi.listQuickBooksPayments(id),
    enabled: !!id,
  });

export const usePOQuickBooksPaymentOptionsQuery = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: poKeys.quickBooksPaymentOptions(id),
    queryFn: () => poApi.listQuickBooksPaymentOptions(id),
    enabled: !!id && enabled,
  });

/* ---- mutations ---- */

export const useCreatePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePOInput) => poApi.create(data),
    onSuccess: async () => {
      await invalidatePOQueries(qc);
    },
    onError: (err) => toastApiError(err, 'Failed to create purchase order.'),
  });
};

export const useUpdatePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePOInput> }) =>
      poApi.update(id, data),
    onSuccess: async (updated) => {
      await invalidatePOQueries(qc, updated.id);
    },
    onError: (err) => toastApiError(err, 'Failed to update purchase order.'),
  });
};

export const useIssuePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emailVendor }: { id: string; emailVendor?: boolean }) =>
      poApi.issue(id, { emailVendor }),
    onSuccess: async (_, { id }) => {
      await invalidatePOQueries(qc, id);
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
    onSuccess: async (_, { id }) => {
      await invalidatePOQueries(qc, id);
    },
    onError: (err) => toastApiError(err, 'Failed to cancel purchase order.'),
  });
};

export const useRecordDeliveryMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; deliveryDate: string; notes?: string }) =>
      poApi.recordDelivery(id, data),
    onSuccess: async (_, { id }) => {
      await invalidatePOQueries(qc, id);
    },
    onError: (err) => toastApiError(err, 'Failed to record delivery.'),
  });
};

export const useRevertToDraftMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => poApi.revertToDraft(id),
    onSuccess: async (_, id) => {
      await invalidatePOQueries(qc, id);
      toast.success('Purchase order reverted to draft.');
    },
    onError: (err) => toastApiError(err, 'Failed to revert to draft.'),
  });
};

export const useAddPOQuickBooksPaymentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: AddPOQuickBooksPaymentInput }) =>
      poApi.addQuickBooksPayment(poId, data),
    onSuccess: async (_, { poId }) => {
      qc.removeQueries({ queryKey: poKeys.quickBooksPaymentOptions(poId) });
      await invalidateProjectQueries(qc, [
        poKeys.detail(poId),
        poKeys.quickBooksPayments(poId),
        poKeys.quickBooksPaymentOptions(poId),
      ]);
      toast.success('QuickBooks payment added.');
    },
    onError: (err) => toastApiError(err, 'Failed to add QuickBooks payment.'),
  });
};

export const useAddPOQuickBooksPaymentsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: AddPOQuickBooksPaymentsInput }) =>
      poApi.addQuickBooksPayments(poId, data),
    onSuccess: async (payments, { poId }) => {
      qc.removeQueries({ queryKey: poKeys.quickBooksPaymentOptions(poId) });
      await invalidateProjectQueries(qc, [
        poKeys.detail(poId),
        poKeys.quickBooksPayments(poId),
        poKeys.quickBooksPaymentOptions(poId),
      ]);
      toast.success(
        payments.length === 1
          ? 'QuickBooks payment added.'
          : `${payments.length} QuickBooks payments added.`
      );
    },
    onError: (err) => toastApiError(err, 'Failed to add QuickBooks payments.'),
  });
};

export const useRemovePOQuickBooksPaymentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, paymentId }: { poId: string; paymentId: string }) =>
      poApi.removeQuickBooksPayment(poId, paymentId),
    onSuccess: async (_, { poId }) => {
      qc.removeQueries({ queryKey: poKeys.quickBooksPaymentOptions(poId) });
      await invalidateProjectQueries(qc, [
        poKeys.detail(poId),
        poKeys.quickBooksPayments(poId),
        poKeys.quickBooksPaymentOptions(poId),
      ]);
      toast.success('QuickBooks payment removed.');
    },
    onError: (err) => toastApiError(err, 'Failed to remove QuickBooks payment.'),
  });
};

/* ---- line item mutations ---- */

export const useAddPOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: POLineItemInput }) =>
      poApi.addLineItem(poId, data),
    onSuccess: async (_, { poId }) => {
      await invalidatePOQueries(qc, poId);
    },
    onError: (err) => toastApiError(err, 'Failed to add line item.'),
  });
};

export const useRemovePOLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, lineItemId }: { poId: string; lineItemId: string }) =>
      poApi.removeLineItem(poId, lineItemId),
    onSuccess: async (_, { poId }) => {
      await invalidatePOQueries(qc, poId);
    },
    onError: (err) => toastApiError(err, 'Failed to remove line item.'),
  });
};
