import { toastApiError } from '@/app/lib/toast-api-error';
import {
  monthlyBillsApi,
  type MonthlyBillsQueryParams,
} from '@/modules/monthly-bills/api/monthly-bills.api';
import { monthlyBillsKeys } from '@/modules/monthly-bills/constants/monthly-bills.keys';
import type {
  BulkUpsertPlannedPaymentsPayload,
  MarkPaymentPayload,
  MonthlyBillsResponse,
  PlannedPaymentRecord,
  UpsertPlannedPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

function patchPlannedPaymentsInMonthlyBillsCache(
  queryClient: QueryClient,
  records: PlannedPaymentRecord[]
) {
  if (records.length === 0) return;

  queryClient.setQueriesData<InfiniteData<MonthlyBillsResponse>>(
    { queryKey: monthlyBillsKeys.all },
    (old) => {
      if (!old?.pages?.length) return old;

      let plannedDelta = 0;
      let readyDelta = 0;
      let hasChanges = false;
      const recordsByPurchaseOrderId = new Map(
        records.map((record) => [record.purchaseOrderId, record])
      );

      const pages = old.pages.map((page) => ({
        ...page,
        groups: page.groups.map((group) => ({
          ...group,
          bills: group.bills.map((bill) => {
            const record = recordsByPurchaseOrderId.get(bill.purchaseOrder.id);
            if (!record) return bill;

            const previousAmount = bill.plannedPayment?.amount ?? 0;
            const previousReady =
              previousAmount > 0 && (bill.plannedPayment?.isReady ?? false);
            const nextReady = record.amount > 0 && record.isReady;

            plannedDelta += record.amount - previousAmount;
            readyDelta += Number(nextReady) - Number(previousReady);
            hasChanges = true;

            return {
              ...bill,
              plannedPayment: {
                amount: record.amount,
                isReady: nextReady,
              },
            };
          }),
        })),
      }));

      if (!hasChanges) return old;

      return {
        ...old,
        pages: pages.map((page) => ({
          ...page,
          meta: {
            ...page.meta,
            summary: {
              ...page.meta.summary,
              planned: page.meta.summary.planned + plannedDelta,
              readyCount: page.meta.summary.readyCount + readyDelta,
            },
          },
        })),
      };
    }
  );
}

export const useInfiniteMonthlyBillsQuery = (params: MonthlyBillsQueryParams, enabled = true) =>
  useInfiniteQuery({
    queryKey: monthlyBillsKeys.list(params),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      monthlyBillsApi.listMonthlyBills({ ...params, page: Number(pageParam) }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.pagination.hasNextPage
        ? lastPage.meta.pagination.currentPage + 1
        : undefined,
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
