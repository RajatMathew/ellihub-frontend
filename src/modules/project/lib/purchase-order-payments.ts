import Decimal from 'decimal.js';

import { roundMoneyDecimal, toCommercialDecimal } from './commercial-decimal';

/**
 * What has been paid against a purchase order.
 *
 * Every payment counts - those made through QuickBooks and those loaded from a
 * legacy migration workbook alike - which is what Monthly Bills shows and what
 * decides whether a PO is paid in full. The page used to add up paid invoices
 * instead, so a payment with no invoice behind it (every imported one, and any
 * made through Monthly Bills) never showed as paid.
 *
 * The API works the figure out (`paymentSummary`); a response without it falls
 * back to adding up the payments it carries.
 */
export function purchaseOrderAmountPaid(po: {
  paymentSummary?: { totalPaid: string } | null;
  poPayments?: { amount: number | string }[];
}): number {
  if (po.paymentSummary) return toCommercialDecimal(po.paymentSummary.totalPaid).toNumber();

  return roundMoneyDecimal(
    (po.poPayments ?? []).reduce(
      (sum, payment) => sum.plus(toCommercialDecimal(payment.amount)),
      new Decimal(0)
    )
  ).toNumber();
}
