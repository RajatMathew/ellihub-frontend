import { describe, expect, test } from 'bun:test';

import { purchaseOrderAmountPaid } from '../src/modules/project/lib/purchase-order-payments';
import { poDetailSchema } from '../src/modules/project/schemas/purchase-order/purchase-order.schema';

/**
 * What the PO page says has been paid.
 *
 * It used to add up paid invoices, so a payment with no invoice behind it -
 * every one loaded from a migration workbook, and any made through Monthly
 * Bills - never showed. It now shows every payment, as Monthly Bills does.
 * PO 23557 of PS 676KElliHub_Migration.xlsx: $8,050 paid, no invoices.
 */
const importSource = {
  fileName: 'PS 676KElliHub_Migration.xlsx',
  fileId: 'file0001',
  sheet: 'PURCHASE_ORDERS',
  row: 13,
  legacyNumber: '23557',
  importedAt: '2026-09-24T16:52:11.000Z',
  importedBy: { id: '3TKaLgKo', name: 'Elli Admin' },
};

describe('what the PO page says has been paid', () => {
  const po = poDetailSchema.parse({
    id: 'po000001',
    projectId: 'proj0001',
    vendorId: 'vend0001',
    status: { id: 'ISSUED', name: 'ISSUED', label: 'Issued', color: 'info' },
    poPayments: [
      { id: 'pay00001', purchaseOrderId: 'po000001', amount: '6628.14', source: 'IMPORT' },
    ],
    paymentSummary: { billTotal: '8050.00', totalPaid: '8050.00', balance: '0.00' },
    importSource,
  });

  test("is the API's total of every payment, imported ones included", () => {
    expect(purchaseOrderAmountPaid(po)).toBe(8050);
  });

  test('is not paid invoices: a PO with no invoices still shows what was paid', () => {
    expect(po.paymentSummary?.totalPaid).toBe('8050.00');
    expect(purchaseOrderAmountPaid({ ...po, poPayments: [] })).toBe(8050);
  });

  test('adds up the payments exactly when the API has not worked it out', () => {
    expect(
      purchaseOrderAmountPaid({
        poPayments: [
          { amount: '0.10' },
          { amount: '0.20' },
          { amount: 806.4 },
          { amount: '80.41' },
        ],
      })
    ).toBe(887.11);
  });

  test('marks the PO itself as imported', () => {
    expect(po.importSource).toMatchObject({
      sheet: 'PURCHASE_ORDERS',
      row: 13,
      legacyNumber: '23557',
    });
  });
});
