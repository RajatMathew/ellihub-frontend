import { describe, expect, test } from 'bun:test';

import { QueryClient, type InfiniteData } from '@tanstack/react-query';

import { monthlyBillsKeys } from '../src/modules/monthly-bills/constants/monthly-bills.keys';
import { patchPlannedPaymentsInMonthlyBillsCache } from '../src/modules/monthly-bills/lib/monthly-bills-cache';
import type { MonthlyBillsResponse } from '../src/modules/monthly-bills/schemas/monthly-bills.schema';

const listParams = { month: 7, year: 2026, page: 1, size: 8 };

function createMonthlyBillsData(): InfiniteData<MonthlyBillsResponse> {
  return {
    pageParams: [1],
    pages: [
      {
        groups: [
          {
            project: {
              id: 'project-1',
              name: 'Project One',
              jobNumber: '1001',
            },
            bills: [
              {
                purchaseOrder: {
                  id: 'po-1',
                  poNumber: 'PO-1',
                  vendor: { id: 'vendor-1', name: 'Vendor One' },
                  subChangeOrders: [],
                },
                original: 500,
                balance: 500,
                totalPaid: 0,
                plannedPayment: { amount: 100, isReady: false },
                payments: [],
              },
            ],
          },
        ],
        meta: {
          period: {
            month: 7,
            year: 2026,
            label: 'July 2026',
            isCurrent: true,
            minTxnDate: '2026-07-01',
            maxTxnDate: '2026-07-31',
            defaultTxnDate: '2026-07-30',
          },
          capabilities: {
            canUpdateBills: true,
            canMarkPayment: true,
          },
          summary: {
            projectCount: 1,
            billCount: 1,
            balance: 500,
            planned: 100,
            paidThisMonth: 0,
            readyCount: 0,
          },
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            totalItems: 1,
            itemsPerPage: 8,
          },
        },
      },
    ],
  };
}

describe('monthly bills planned-payment cache patch', () => {
  test('updates subcontractor lists without touching a populated recurring cache', () => {
    const queryClient = new QueryClient();
    const monthlyData = createMonthlyBillsData();
    const recurringData = {
      pageParams: [1],
      pages: [
        {
          groups: [{ ruleId: 'rule-1', occurrences: [] }],
        },
      ],
    };

    queryClient.setQueryData(monthlyBillsKeys.list(listParams), monthlyData);
    queryClient.setQueryData(
      monthlyBillsKeys.recurringList({ month: 7, year: 2026 }),
      recurringData
    );

    expect(() =>
      patchPlannedPaymentsInMonthlyBillsCache(queryClient, [
        {
          id: 'planned-1',
          purchaseOrderId: 'po-1',
          month: 7,
          year: 2026,
          amount: 250,
          isReady: true,
        },
      ])
    ).not.toThrow();

    const updated = queryClient.getQueryData<InfiniteData<MonthlyBillsResponse>>(
      monthlyBillsKeys.list(listParams)
    );

    expect(updated?.pages[0]?.groups[0]?.bills[0]?.plannedPayment).toEqual({
      amount: 250,
      isReady: true,
    });
    expect(updated?.pages[0]?.meta.summary.planned).toBe(250);
    expect(updated?.pages[0]?.meta.summary.readyCount).toBe(1);
    expect(queryClient.getQueryData(monthlyBillsKeys.recurringList({ month: 7, year: 2026 }))).toBe(
      recurringData
    );
  });
});
