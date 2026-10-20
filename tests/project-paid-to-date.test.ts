import { describe, expect, test } from 'bun:test';

import { calculatePrimeContractComputations } from '../src/modules/project/components/overview/use-prime-contract-computations';
import { poStatsSchema } from '../src/modules/project/schemas/purchase-order';

/**
 * The project overview's "Paid to Date" always read $0.00 - it was wired to
 * nothing - and "Balance Due" was simply the contract sum. Paid to Date is now
 * what Monthly Bills (and the imported history) has paid against the
 * project's POs, and Balance Due takes it off the contract sum.
 */
const summary = (paidToDate: number | undefined) =>
  calculatePrimeContractComputations({
    project: undefined,
    contract: undefined,
    primeChangeOrderSummary: {
      projectId: 'proj0001',
      originalContractValue: 100000,
      approvedChangeOrdersCount: 1,
      approvedChangeOrdersTotal: 2500.1,
      approvedChangeOrdersPositiveTotal: 2500.1,
      approvedChangeOrdersNegativeTotal: 0,
      revisedContractValue: 102500.1,
    },
    totalPOCommitted: 0,
    paidToDate,
  });

describe("a project's Paid to Date", () => {
  test('is what has been paid against its POs, and comes off the contract sum', () => {
    const result = summary(40000.2);

    expect(result.contractSum).toBe(102500.1);
    expect(result.paidToDate).toBe(40000.2);
    expect(result.balanceDue).toBe(62499.9);
  });

  test('is unknown, not $0.00, until the PO stats report it', () => {
    const result = summary(undefined);

    expect(result.paidToDate).toBeNull();
    expect(result.balanceDue).toBe(102500.1);
  });

  test('is $0.00 when the stats say nothing has been paid', () => {
    expect(summary(0).paidToDate).toBe(0);
  });

  test('is read from the PO stats, which an older API sends without it', () => {
    const base = {
      totalPurchaseOrders: 2,
      draftPurchaseOrders: 0,
      issuedPurchaseOrders: 2,
      deliveredPurchaseOrders: 0,
      cancelledPurchaseOrders: 0,
      totalCommitted: 5000,
    };

    expect(poStatsSchema.parse({ ...base, totalPaid: 1266.25 }).totalPaid).toBe(1266.25);
    expect(poStatsSchema.parse(base).totalPaid).toBeUndefined();
  });
});
