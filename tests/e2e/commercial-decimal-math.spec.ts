import { expect, test } from '@playwright/test';

import {
  calculateCommercialDocumentTotalsDecimal,
  calculateRFQFinancialSummary,
  calculateRoundedLineAmountDecimal,
  roundMoneyDecimal,
} from '../../src/modules/project/lib/commercial-decimal';

test.describe('commercial decimal math', () => {
  test('rounds money with backend-style half-up behavior', () => {
    expect(roundMoneyDecimal('1.005').toNumber()).toBe(1.01);
    expect(roundMoneyDecimal('2.675').toNumber()).toBe(2.68);
  });

  test('rounds line item amount after decimal multiplication', () => {
    const amount = calculateRoundedLineAmountDecimal({
      quantity: '2.55',
      unitPrice: '19.995',
    });

    expect(amount.toNumber()).toBe(50.99);
  });

  test('calculates RFQ average and median without float drift', () => {
    const summary = calculateRFQFinancialSummary({
      deliverables: [{ quantity: '2.55', estimatedUnitPrice: '19.995' }],
      quotes: [{ grandTotal: '0.10' }, { grandTotal: '0.20' }],
    });

    expect(summary.deliverablesTotal).toBe(50.99);
    expect(summary.lowestQuote).toBe(0.1);
    expect(summary.highestQuote).toBe(0.2);
    expect(summary.averageQuote).toBe(0.15);
    expect(summary.medianQuote).toBe(0.15);
  });

  test('calculates PO and SCO totals with discount, shipping, and tax', () => {
    const totals = calculateCommercialDocumentTotalsDecimal({
      lineItems: [
        { quantity: '2.55', unitPrice: '19.995' },
        { quantity: '1', unitPrice: '0.10' },
        { quantity: '1', unitPrice: '0.20' },
      ],
      negotiatedDiscount: '1.005',
      shippingHandlingFee: '2.675',
      taxPercent: '8.875',
    });

    expect(totals.subtotal.toNumber()).toBe(51.29);
    expect(totals.negotiatedDiscount.toNumber()).toBe(1.01);
    expect(totals.shippingHandlingFee.toNumber()).toBe(2.68);
    expect(totals.taxableAmount.toNumber()).toBe(52.96);
    expect(totals.taxAmount.toNumber()).toBe(4.7);
    expect(totals.total.toNumber()).toBe(57.66);
  });
});
