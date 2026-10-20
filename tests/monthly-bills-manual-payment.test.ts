import { QueryClient, type InfiniteData } from '@tanstack/react-query';
import { describe, expect, test } from 'bun:test';

import {
  isImportedPayment,
  isManualPayment,
  paymentSourceSchema,
} from '../src/app/lib/import-source';
import { monthlyBillsKeys } from '../src/modules/monthly-bills/constants/monthly-bills.keys';
import {
  buildManualPaymentPayload,
  getDefaultMarkPaymentMode,
} from '../src/modules/monthly-bills/lib/mark-payment-mode';
import { patchMarkedPaymentInMonthlyBillsCache } from '../src/modules/monthly-bills/lib/monthly-bills-cache';
import {
  markManualPaymentFormSchema,
  markPaymentFormSchema,
  markPaymentResultSchema,
  monthlyBillPaymentSchema,
  type MonthlyBillsResponse,
} from '../src/modules/monthly-bills/schemas/monthly-bills.schema';

/**
 * Paying a bill outside QuickBooks. Mark Payment could only create a
 * QuickBooks payment, and Monthly Bills would not open at all without a
 * QuickBooks connection, so a bill paid by check, wire or card could not be
 * shown paid.
 */
describe('a manual payment, as the client reads it', () => {
  test('is a payment source of its own, neither QuickBooks nor imported', () => {
    expect(paymentSourceSchema.parse('MANUAL')).toBe('MANUAL');
    expect(isManualPayment({ source: 'MANUAL' })).toBe(true);
    expect(isImportedPayment({ source: 'MANUAL' })).toBe(false);
    expect(isManualPayment({ source: 'QUICKBOOKS' })).toBe(false);
  });

  test('parses in the bill list, with its bank account and who recorded it', () => {
    const payment = monthlyBillPaymentSchema.parse({
      id: 'pay00001',
      txnDate: '2026-07-14',
      amount: '200.00',
      source: 'MANUAL',
      reference: 'Check #3617',
      memo: null,
      checkNumber: null,
      transactionId: null,
      transactionUrl: null,
      bankAccountName: 'Chase Operating',
      recordedByName: 'Fayis',
      importSource: null,
    });

    expect(payment.source).toBe('MANUAL');
    expect(payment.bankAccountName).toBe('Chase Operating');
    expect(payment.recordedByName).toBe('Fayis');
  });

  test('comes back from marking with no QuickBooks vendor, account or transaction', () => {
    const result = markPaymentResultSchema.parse({
      id: 'pay00001',
      purchaseOrderId: 'po-1',
      amount: '200.00',
      source: 'MANUAL',
      qbVendorId: null,
      bankAccountId: null,
      txnDate: '2026-07-14T00:00:00.000Z',
      reference: 'Check #3617',
      memo: null,
      checkNumber: null,
      transactionId: null,
      transactionUrl: null,
      billState: {
        purchaseOrderId: 'po-1',
        totalPaid: '200.00',
        balance: '300.00',
        fullyPaid: false,
        plannedPayment: { amount: '0', isReady: false },
      },
    });

    expect(result.source).toBe('MANUAL');
    expect(result.billState.balance).toBe(300);
  });
});

describe('the Mark Payment mode', () => {
  test('defaults to QuickBooks when it is connected', () => {
    expect(getDefaultMarkPaymentMode({ isConnected: true, isLoading: false })).toBe('QUICKBOOKS');
  });

  test('is manual when QuickBooks is not connected', () => {
    expect(getDefaultMarkPaymentMode({ isConnected: false, isLoading: false })).toBe('MANUAL');
  });

  test('stays on QuickBooks while the connection is still being checked', () => {
    expect(getDefaultMarkPaymentMode({ isConnected: false, isLoading: true })).toBe('QUICKBOOKS');
  });
});

describe('the manual payment form', () => {
  const context = { purchaseOrderId: 'po-1', month: 7, year: 2026 };

  test('needs only a date: the bank account, reference and memo are optional', () => {
    expect(
      markManualPaymentFormSchema.safeParse({
        txnDate: '2026-07-14',
        bankAccountId: '',
        reference: '',
        memo: '',
      }).success
    ).toBe(true);
    expect(
      markManualPaymentFormSchema.safeParse({
        txnDate: '',
        bankAccountId: '',
        reference: '',
        memo: '',
      }).success
    ).toBe(false);
  });

  test('sends no bank account rather than an empty one, and trims what was typed', () => {
    expect(
      buildManualPaymentPayload(
        { txnDate: '2026-07-14', bankAccountId: '', reference: '  Check #3617 ', memo: ' ' },
        context
      )
    ).toEqual({
      purchaseOrderId: 'po-1',
      month: 7,
      year: 2026,
      txnDate: '2026-07-14',
      bankAccountId: null,
      reference: 'Check #3617',
      memo: '',
    });
    expect(
      buildManualPaymentPayload(
        { txnDate: '2026-07-14', bankAccountId: 'bank0001', reference: '', memo: '' },
        context
      ).bankAccountId
    ).toBe('bank0001');
  });
});

describe('the QuickBooks payment form', () => {
  test('says which choice is missing instead of failing silently', () => {
    const result = markPaymentFormSchema.safeParse({
      qbVendorId: 'qb-vendor-1',
      bankAccountId: '',
      categoryId: '',
      txnDate: '2026-07-14',
      description: 'PO#1 - Partial Payment 1',
      memo: '',
      saveVendorMapping: false,
      printLater: false,
    });

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Select the bank account.',
      'Select the category.',
    ]);
  });
});

describe('marking a manual payment in the cached bill list', () => {
  test('shows it as manual, with its reference, straight away', () => {
    const queryClient = new QueryClient();
    const listParams = { month: 7, year: 2026, page: 1, size: 8 };
    const data: InfiniteData<MonthlyBillsResponse> = {
      pageParams: [1],
      pages: [
        {
          groups: [
            {
              project: { id: 'project-1', name: 'Project One', jobNumber: '1001' },
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
                  plannedPayment: { amount: 200, isReady: true },
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
            capabilities: { canUpdateBills: true, canMarkPayment: true },
            summary: {
              projectCount: 1,
              billCount: 1,
              balance: 500,
              planned: 200,
              paidThisMonth: 0,
              readyCount: 1,
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
    queryClient.setQueryData(monthlyBillsKeys.list(listParams), data);

    patchMarkedPaymentInMonthlyBillsCache(
      queryClient,
      {
        id: 'pay00001',
        purchaseOrderId: 'po-1',
        amount: 200,
        source: 'MANUAL',
        reference: 'Check #3617',
        memo: null,
        txnDate: '2026-07-14',
        billState: {
          purchaseOrderId: 'po-1',
          totalPaid: 200,
          balance: 300,
          fullyPaid: false,
          plannedPayment: { amount: 0, isReady: false },
        },
      },
      { month: 7, year: 2026 }
    );

    const bill = queryClient.getQueryData<InfiniteData<MonthlyBillsResponse>>(
      monthlyBillsKeys.list(listParams)
    )?.pages[0]?.groups[0]?.bills[0];
    expect(bill?.payments[0]).toMatchObject({
      id: 'pay00001',
      source: 'MANUAL',
      reference: 'Check #3617',
      transactionUrl: undefined,
    });
    expect(bill?.balance).toBe(300);
  });
});
