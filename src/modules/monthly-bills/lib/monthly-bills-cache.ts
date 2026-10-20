import type {
  MarkPaymentPayload,
  MarkPaymentResult,
  MonthlyBillsResponse,
  PlannedPaymentRecord,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { monthlyBillsKeys } from '../constants/monthly-bills.keys';
import { sumMonthlyBillMoney } from './monthly-bills-money';

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

export function patchMarkedPaymentInMonthlyBillsCache(
  queryClient: QueryClient,
  payment: MarkPaymentResult,
  period: Pick<MarkPaymentPayload, 'month' | 'year'>
) {
  queryClient.setQueriesData<InfiniteData<MonthlyBillsResponse>>(
    { queryKey: monthlyBillsKeys.lists() },
    (old) => {
      if (!old?.pages?.length || !hasMonthlyBillGroups(old)) return old;

      const isTargetPeriod = (page: MonthlyBillsResponse) =>
        page.meta.period.month === period.month && page.meta.period.year === period.year;
      let previousBill: MonthlyBillsResponse['groups'][number]['bills'][number] | undefined;

      for (const page of old.pages) {
        if (!isTargetPeriod(page)) continue;
        for (const group of page.groups) {
          previousBill = group.bills.find(
            (bill) => bill.purchaseOrder.id === payment.purchaseOrderId
          );
          if (previousBill) break;
        }
        if (previousBill) break;
      }

      if (!previousBill) return old;

      const paymentAlreadyPresent = previousBill.payments.some(
        (existing) => existing.id === payment.id
      );
      const previousPlannedAmount = previousBill.plannedPayment?.amount ?? 0;
      const previousReady =
        previousPlannedAmount > 0 && (previousBill.plannedPayment?.isReady ?? false);
      const balanceDelta = payment.billState.balance - previousBill.balance;
      const paidThisMonthDelta = paymentAlreadyPresent ? 0 : payment.amount;
      // A QuickBooks or a manual payment - never an import. The bank account
      // name and who recorded it arrive with the refetch that follows.
      const nextPayment = {
        id: payment.id,
        txnDate: payment.txnDate,
        amount: payment.amount,
        source: payment.source ?? ('QUICKBOOKS' as const),
        reference: payment.reference ?? null,
        memo: payment.memo ?? null,
        checkNumber: payment.checkNumber,
        transactionId: payment.transactionId,
        transactionUrl: payment.transactionUrl,
        bankAccountName: null,
        recordedByName: null,
        importSource: null,
      };

      return {
        ...old,
        pages: old.pages.map((page) => {
          if (!isTargetPeriod(page)) return page;

          return {
            ...page,
            groups: page.groups.map((group) => ({
              ...group,
              bills: group.bills.map((bill) =>
                bill.purchaseOrder.id === payment.purchaseOrderId
                  ? {
                      ...bill,
                      totalPaid: payment.billState.totalPaid,
                      balance: payment.billState.balance,
                      plannedPayment: payment.billState.plannedPayment,
                      payments: [
                        nextPayment,
                        ...bill.payments.filter((existing) => existing.id !== payment.id),
                      ],
                    }
                  : bill
              ),
            })),
            meta: {
              ...page.meta,
              summary: {
                ...page.meta.summary,
                balance: sumMonthlyBillMoney([page.meta.summary.balance, balanceDelta]),
                planned: sumMonthlyBillMoney([page.meta.summary.planned, -previousPlannedAmount]),
                paidThisMonth: sumMonthlyBillMoney([
                  page.meta.summary.paidThisMonth,
                  paidThisMonthDelta,
                ]),
                readyCount: Math.max(0, page.meta.summary.readyCount - Number(previousReady)),
              },
            },
          };
        }),
      };
    }
  );
}
