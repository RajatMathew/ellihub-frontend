import { toastApiError } from '@/app/lib/toast-api-error';
import {
  monthlyBillsApi,
  type MonthlyBillsQueryParams,
  type MonthlyBillsSummaryQueryParams,
} from '@/modules/monthly-bills/api/monthly-bills.api';
import { monthlyBillsKeys } from '@/modules/monthly-bills/constants/monthly-bills.keys';
import {
  patchMarkedPaymentInMonthlyBillsCache,
  patchPlannedPaymentsInMonthlyBillsCache,
} from '@/modules/monthly-bills/lib/monthly-bills-cache';
import type {
  BulkUpsertPlannedPaymentsPayload,
  MarkManualPaymentPayload,
  MarkPaymentPayload,
  MarkPaymentResult,
  PoManualPaymentPayload,
  PoManualPaymentResult,
  UpsertPlannedPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { poKeys } from '@/modules/project/constants/purchase-order/purchase-order.keys';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useInfiniteMonthlyBillsQuery = (params: MonthlyBillsQueryParams, enabled = true) =>
  useInfiniteQuery({
    queryKey: monthlyBillsKeys.list(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      monthlyBillsApi.listMonthlyBills({ ...params, page: Number(pageParam) }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.pagination.hasNextPage ? lastPage.meta.pagination.currentPage + 1 : undefined,
    enabled,
    staleTime: 60_000,
  });

export const useMonthlyBillsSummaryQuery = (
  params: MonthlyBillsSummaryQueryParams,
  enabled = true
) =>
  useQuery({
    queryKey: monthlyBillsKeys.summary(params),
    queryFn: () => monthlyBillsApi.getSummary(params),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useUpsertPlannedPaymentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpsertPlannedPaymentPayload) =>
      monthlyBillsApi.upsertPlannedPayment(payload),
    onSuccess: (record) => patchPlannedPaymentsInMonthlyBillsCache(queryClient, [record]),
    onError: (error) => toastApiError(error, 'Failed to save planned payment.'),
  });
};

export const useBulkUpsertPlannedPaymentsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BulkUpsertPlannedPaymentsPayload) =>
      monthlyBillsApi.bulkUpsertPlannedPayments(payload),
    onSuccess: (records) => patchPlannedPaymentsInMonthlyBillsCache(queryClient, records),
    onError: (error) => toastApiError(error, 'Failed to save planned payments.'),
  });
};

interface MarkPaymentMutationOptions {
  onSuccess?: (payment: MarkPaymentResult) => void;
}

function refreshMonthlyBills(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    queryKey: monthlyBillsKeys.lists(),
    refetchType: 'active',
  });
  void queryClient.invalidateQueries({
    queryKey: monthlyBillsKeys.summaries(),
    refetchType: 'active',
  });
}

export const useMarkPaymentMutation = (options: MarkPaymentMutationOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MarkPaymentPayload) => monthlyBillsApi.markPayment(payload),
    onSuccess: (payment, variables) => {
      options.onSuccess?.(payment);
      patchMarkedPaymentInMonthlyBillsCache(queryClient, payment, variables);
      refreshMonthlyBills(queryClient);
    },
    onError: (error) => toastApiError(error, 'Failed to record payment.'),
  });
};

export const useMarkManualPaymentMutation = (options: MarkPaymentMutationOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MarkManualPaymentPayload) => monthlyBillsApi.markManualPayment(payload),
    onSuccess: (payment, variables) => {
      options.onSuccess?.(payment);
      patchMarkedPaymentInMonthlyBillsCache(queryClient, payment, variables);
      refreshMonthlyBills(queryClient);
    },
    onError: (error) => toastApiError(error, 'Failed to record payment.'),
  });
};

/**
 * A PO's own page shows its payments and balance; refetch it, and the PO lists
 * and stats that show what is paid, once a payment is added or taken away.
 */
function refreshPurchaseOrderPayments(
  queryClient: ReturnType<typeof useQueryClient>,
  purchaseOrderId: string
) {
  void queryClient.invalidateQueries({ queryKey: poKeys.detail(purchaseOrderId) });
  void queryClient.invalidateQueries({ queryKey: poKeys.list() });
}

export const useRecordPurchaseOrderManualPaymentMutation = (
  purchaseOrderId: string,
  options: { onSuccess?: (payment: PoManualPaymentResult) => void } = {}
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PoManualPaymentPayload) =>
      monthlyBillsApi.recordPurchaseOrderManualPayment(purchaseOrderId, payload),
    onSuccess: (payment) => {
      toast.success('Payment recorded.');
      options.onSuccess?.(payment);
      refreshPurchaseOrderPayments(queryClient, purchaseOrderId);
      refreshMonthlyBills(queryClient);
    },
    onError: (error) => toastApiError(error, 'Failed to record payment.'),
  });
};

export const useDeleteManualPaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) => monthlyBillsApi.deleteManualPayment(paymentId),
    onSuccess: (billState) => {
      toast.success('Payment deleted.');
      refreshMonthlyBills(queryClient);
      refreshPurchaseOrderPayments(queryClient, billState.purchaseOrderId);
    },
    onError: (error) => toastApiError(error, 'Failed to delete payment.'),
  });
};

export const useMonthlyBillBankAccountsQuery = (enabled = true) =>
  useQuery({
    queryKey: monthlyBillsKeys.bankAccounts(),
    queryFn: () => monthlyBillsApi.listBankAccounts(),
    enabled,
    staleTime: 30 * 60 * 1000,
  });
