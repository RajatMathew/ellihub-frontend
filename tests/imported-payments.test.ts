import { describe, expect, test } from 'bun:test';

import {
  describeImportSource,
  isImportedPayment,
  type ImportSource,
} from '../src/app/lib/import-source';
import { paymentTrackingStatusSchema } from '../src/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';
import { monthlyBillPaymentSchema } from '../src/modules/monthly-bills/schemas/monthly-bills.schema';
import { poPaymentSchema } from '../src/modules/project/schemas/purchase-order/purchase-order.schema';

/**
 * Payments loaded from a legacy migration workbook.
 *
 * They were never made through QuickBooks: no transaction, no link, never
 * tracked. What they have instead is where they came from. These fixtures are
 * what elli-core returned for PO 23557 of PS 676KElliHub_Migration.xlsx.
 */
const importSource: ImportSource = {
  fileName: 'PS 676KElliHub_Migration.xlsx',
  fileId: 'file0001',
  sheet: 'PO_PAYMENTS',
  row: 36,
  legacyNumber: '23557',
  importedAt: '2026-09-24T16:52:11.000Z',
  importedBy: { id: '3TKaLgKo', name: 'Elli Admin' },
};

const importedPayment = {
  id: 'pay00001',
  purchaseOrderId: 'po000001',
  amount: '6628.14',
  txnDate: '2024-06-06',
  source: 'IMPORT',
  reference: 'Check # 4457',
  memo: null,
  checkNumber: '4457',
  qbVendorId: null,
  bankAccountId: null,
  transactionId: null,
  transactionUrl: null,
  importSource,
};

describe('an imported payment', () => {
  test('is told apart from a QuickBooks one', () => {
    expect(isImportedPayment({ source: 'IMPORT' })).toBe(true);
    expect(isImportedPayment({ source: 'QUICKBOOKS' })).toBe(false);
    // A response from before payments had a source is a QuickBooks payment.
    expect(isImportedPayment({})).toBe(false);
  });

  test('says which workbook, sheet and row it came from', () => {
    expect(describeImportSource(importSource)).toBe(
      'PS 676KElliHub_Migration.xlsx · PO_PAYMENTS row 36'
    );
    expect(describeImportSource({ ...importSource, row: null })).toBe(
      'PS 676KElliHub_Migration.xlsx · PO_PAYMENTS'
    );
    expect(describeImportSource({ ...importSource, sheet: null, row: null })).toBe(
      'PS 676KElliHub_Migration.xlsx'
    );
  });

  test('parses in Monthly Bills with no QuickBooks fields at all', () => {
    const parsed = monthlyBillPaymentSchema.parse(importedPayment);

    expect(parsed).toMatchObject({
      source: 'IMPORT',
      reference: 'Check # 4457',
      transactionUrl: null,
      importSource: { sheet: 'PO_PAYMENTS', row: 36 },
    });
  });

  test('parses on the purchase order', () => {
    const parsed = poPaymentSchema.parse(importedPayment);

    expect(parsed.source).toBe('IMPORT');
    expect(parsed.importSource?.fileName).toBe('PS 676KElliHub_Migration.xlsx');
  });

  test('still parses a QuickBooks payment from before these fields existed', () => {
    expect(
      monthlyBillPaymentSchema.parse({
        id: 'pay00002',
        txnDate: '2026-07-30',
        amount: '100.00',
        checkNumber: '1001',
        transactionId: 'qb-payment-1',
        transactionUrl: 'https://quickbooks.example/check/1',
      })
    ).toMatchObject({ amount: 100, transactionId: 'qb-payment-1' });
  });

  test('is NOT_TRACKED, a status the payment-conflicts page accepts', () => {
    expect(paymentTrackingStatusSchema.parse('NOT_TRACKED')).toBe('NOT_TRACKED');
  });
});
