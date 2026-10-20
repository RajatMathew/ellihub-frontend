import { describe, expect, test } from 'bun:test';

import {
  describePaymentSource,
  describeQuickBooksSync,
} from '../src/modules/project/lib/purchase-order-payment-detail';
import { poPaymentDetailSchema } from '../src/modules/project/schemas/purchase-order/purchase-order.schema';

describe('a payment details view', () => {
  test('names each kind of payment the way its card does', () => {
    expect(describePaymentSource('IMPORT')).toEqual({ label: 'Imported', variant: 'info' });
    expect(describePaymentSource('MANUAL')).toEqual({ label: 'Manual', variant: 'secondary' });
    expect(describePaymentSource('QUICKBOOKS')).toEqual({
      label: 'QuickBooks',
      variant: 'primary',
    });
  });

  test('says in words whether QuickBooks still agrees, counting open conflicts', () => {
    expect(describeQuickBooksSync('TRACKED', 0)).toBe('In sync with QuickBooks');
    expect(describeQuickBooksSync('CONFLICT', 1)).toBe('Changed in QuickBooks - 1 open conflict');
    expect(describeQuickBooksSync('CONFLICT', 3)).toBe('Changed in QuickBooks - 3 open conflicts');
    expect(describeQuickBooksSync('MISSING', 0)).toBe('Not found in QuickBooks');
    expect(describeQuickBooksSync('LEGACY_UNTRACKED', 0)).toBe('Not tracked');
  });

  test('a tracking status this client does not know yet reads as unknown, not an error', () => {
    expect(describeQuickBooksSync('SOMETHING_NEW', 0)).toBe('Unknown');
  });

  test('parses the API detail, money arriving as strings', () => {
    const parsed = poPaymentDetailSchema.parse({
      id: 'pay00001',
      purchaseOrderId: 'po000001',
      poNumber: 'PO-26783',
      vendorName: 'AMECOM NY, LLC',
      amount: '3009.72',
      txnDate: '2025-09-08T00:00:00.000Z',
      source: 'QUICKBOOKS',
      reference: null,
      memo: null,
      checkNumber: '1202',
      bankAccountName: 'BofA 4421',
      recordedByName: 'Ana P.',
      recordedAt: '2025-09-08T15:00:00.000Z',
      quickBooks: {
        transactionUrl: null,
        vendorName: 'Amecom NY',
        printStatus: null,
        printLater: null,
        trackingStatus: 'TRACKED',
        openConflictCount: 0,
        lines: [{ amount: '3009.72', categoryName: 'Job Materials' }],
      },
      importSource: null,
    });

    expect(parsed.amount).toBe(3009.72);
    expect(parsed.quickBooks?.lines[0]?.amount).toBe(3009.72);
  });
});
