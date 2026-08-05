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
  MarkPaymentPayload,
  MarkPaymentResult,
  UpsertPlannedPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export const useMarkPaymentMutation = (options: MarkPaymentMutationOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MarkPaymentPayload) => monthlyBillsApi.markPayment(payload),
    onSuccess: (payment, variables) => {
      options.onSuccess?.(payment);
      patchMarkedPaymentInMonthlyBillsCache(queryClient, payment, variables);
      void queryClient.invalidateQueries({
        queryKey: monthlyBillsKeys.lists(),
        refetchType: 'active',
      });
      void queryClient.invalidateQueries({
        queryKey: monthlyBillsKeys.summaries(),
        refetchType: 'active',
      });
    },
    onError: (error) => toastApiError(error, 'Failed to record payment.'),
  });
};
