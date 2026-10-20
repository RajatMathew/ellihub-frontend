import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, test } from 'bun:test';

import { monthlyBillsKeys } from '../src/modules/monthly-bills/constants/monthly-bills.keys';
import {
  patchMarkedPaymentInMonthlyBillsCache,
  patchPlannedPaymentsInMonthlyBillsCache,
} from '../src/modules/monthly-bills/lib/monthly-bills-cache';
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

  test('immediately applies a marked payment and remains idempotent', () => {
    const queryClient = new QueryClient();
    const monthlyData = createMonthlyBillsData();
    const bill = monthlyData.pages[0]?.groups[0]?.bills[0];
    const summary = monthlyData.pages[0]?.meta.summary;
    if (!bill || !summary) throw new Error('Monthly bill test fixture is incomplete.');

    bill.plannedPayment = { amount: 100, isReady: true };
    summary.readyCount = 1;
    const queryKey = monthlyBillsKeys.list(listParams);
    queryClient.setQueryData(queryKey, monthlyData);

    const payment = {
      id: 'payment-1',
      purchaseOrderId: 'po-1',
      amount: 100,
      qbVendorId: 'qb-vendor-1',
      bankAccountId: 'qb-bank-1',
      txnDate: '2026-07-30',
      checkNumber: '1001',
      transactionId: 'qb-payment-1',
      transactionUrl: 'https://quickbooks.example/check/1',
      billState: {
        purchaseOrderId: 'po-1',
        totalPaid: 100,
        balance: 400,
        fullyPaid: false,
        plannedPayment: { amount: 0, isReady: false },
      },
    };

    patchMarkedPaymentInMonthlyBillsCache(queryClient, payment, { month: 7, year: 2026 });
    patchMarkedPaymentInMonthlyBillsCache(queryClient, payment, { month: 7, year: 2026 });

    const updated = queryClient.getQueryData<InfiniteData<MonthlyBillsResponse>>(queryKey);
    const updatedBill = updated?.pages[0]?.groups[0]?.bills[0];
    const updatedSummary = updated?.pages[0]?.meta.summary;

    expect(updatedBill).toMatchObject({
      totalPaid: 100,
      balance: 400,
      plannedPayment: { amount: 0, isReady: false },
    });
    expect(updatedBill?.payments).toHaveLength(1);
    expect(updatedBill?.payments[0]).toMatchObject({
      id: 'payment-1',
      amount: 100,
      checkNumber: '1001',
      // Marking a payment creates it in QuickBooks: it is never an import, so
      // the payments dialog shows it with its QuickBooks link.
      source: 'QUICKBOOKS',
      importSource: null,
    });
    expect(updatedSummary).toMatchObject({
      balance: 400,
      planned: 0,
      paidThisMonth: 100,
      readyCount: 0,
    });
  });

  test('does not patch a cached list for a different period', () => {
    const queryClient = new QueryClient();
    const augustData = createMonthlyBillsData();
    augustData.pages[0]!.meta.period.month = 8;
    const augustKey = monthlyBillsKeys.list({ month: 8, year: 2026, page: 1, size: 8 });
    queryClient.setQueryData(augustKey, augustData);

    patchMarkedPaymentInMonthlyBillsCache(
      queryClient,
      {
        id: 'payment-1',
        purchaseOrderId: 'po-1',
        amount: 100,
        qbVendorId: 'qb-vendor-1',
        bankAccountId: 'qb-bank-1',
        transactionId: 'qb-payment-1',
        transactionUrl: 'https://quickbooks.example/check/1',
        billState: {
          purchaseOrderId: 'po-1',
          totalPaid: 100,
          balance: 400,
          fullyPaid: false,
          plannedPayment: { amount: 0, isReady: false },
        },
      },
      { month: 7, year: 2026 }
    );

    expect(queryClient.getQueryData(augustKey)).toBe(augustData);
  });
});
