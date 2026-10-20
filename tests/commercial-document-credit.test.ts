import { describe, expect, test } from 'bun:test';

import { calculateCommercialDocumentTotalsDecimal } from '../src/modules/project/lib/commercial-decimal';

/**
 * A credit: a document whose amount comes to less than zero. The app never
 * makes one itself, but legacy change orders loaded from the migration
 * workbooks do - Brookhaven's "CO # 23450-01" takes $5,000 off its PO - and
 * the change order page showed it as "Negotiated Discount --$5,000.00" and a
 * total of $0.00, because the discount was capped at the negative subtotal.
 */
describe('a credit', () => {
  test('keeps its amount as its total, with no discount', () => {
    const totals = calculateCommercialDocumentTotalsDecimal({ subtotal: '-5000.00' });

    expect(totals.negotiatedDiscount.toNumber()).toBe(0);
    expect(totals.total.toNumber()).toBe(-5000);
  });

  test('takes no discount even when one is given', () => {
    const totals = calculateCommercialDocumentTotalsDecimal({
      subtotal: '-5000.00',
      negotiatedDiscount: '100.00',
    });

    expect(totals.negotiatedDiscount.toNumber()).toBe(0);
    expect(totals.total.toNumber()).toBe(-5000);
  });
});

describe('a discount on an ordinary document', () => {
  test('is still capped at the subtotal', () => {
    const totals = calculateCommercialDocumentTotalsDecimal({
      subtotal: '100.00',
      negotiatedDiscount: '150.00',
    });

    expect(totals.negotiatedDiscount.toNumber()).toBe(100);
    expect(totals.total.toNumber()).toBe(0);
  });
});
