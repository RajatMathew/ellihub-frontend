import type {
  MonthlyBillsResponse,
  PlannedPaymentRecord,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { monthlyBillsKeys } from '../constants/monthly-bills.keys';

function hasMonthlyBillGroups(data: InfiniteData<MonthlyBillsResponse>): boolean {
  return data.pages.every(
    (page) => Array.isArray(page.groups) && page.groups.every((group) => Array.isArray(group.bills))
  );
}

export function patchPlannedPaymentsInMonthlyBillsCache(
  queryClient: QueryClient,
  records: PlannedPaymentRecord[]
) {
  if (records.length === 0) return;

  queryClient.setQueriesData<InfiniteData<MonthlyBillsResponse>>(
    { queryKey: monthlyBillsKeys.lists() },
    (old) => {
      if (!old?.pages?.length || !hasMonthlyBillGroups(old)) return old;

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
            const previousReady = previousAmount > 0 && (bill.plannedPayment?.isReady ?? false);
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
