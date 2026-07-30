import { toastApiError } from '@/app/lib/toast-api-error';
import {
  monthlyBillsApi,
  type MonthlyBillsQueryParams,
} from '@/modules/monthly-bills/api/monthly-bills.api';
import { monthlyBillsKeys } from '@/modules/monthly-bills/constants/monthly-bills.keys';
import { patchPlannedPaymentsInMonthlyBillsCache } from '@/modules/monthly-bills/lib/monthly-bills-cache';
import type {
  BulkUpsertPlannedPaymentsPayload,
  MarkPaymentPayload,
  UpsertPlannedPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export const useMarkPaymentMutation = () => {
  return useMutation({
    mutationFn: (payload: MarkPaymentPayload) => monthlyBillsApi.markPayment(payload),
    onError: (error) => toastApiError(error, 'Failed to record payment.'),
  });
};
