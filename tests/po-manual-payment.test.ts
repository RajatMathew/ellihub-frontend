import { describe, expect, test } from 'bun:test';

import {
  buildPoManualPaymentPayload,
  getPoPaymentDateBounds,
  getPurchaseOrderFirstPaymentPeriod,
} from '../src/modules/monthly-bills/lib/po-manual-payment';
import { createPoManualPaymentFormSchema } from '../src/modules/monthly-bills/schemas/monthly-bills.schema';

// Recording a manual payment from the PO page: any amount up to the balance,
// dated from the month the PO was issued to the end of the current month. The
// date alone decides the Monthly Bills month the payment counts toward.

// Oct 19 2026, mid-morning in New York.
const now = new Date('2026-10-19T14:00:00.000Z');

describe('the days a PO payment may be dated', () => {
  test('from the first of the issue month to the last of this month, starting on today', () => {
    expect(getPoPaymentDateBounds('2026-05-22T15:00:00.000Z', now)).toEqual({
      minTxnDate: '2026-05-01',
      maxTxnDate: '2026-10-31',
      defaultTxnDate: '2026-10-19',
    });
  });

  test('reach back across years to the issue month', () => {
    expect(getPoPaymentDateBounds('2024-02-10T15:00:00.000Z', now)?.minTxnDate).toBe('2024-02-01');
  });

  test("today and this month are New York's, not UTC's", () => {
    // 10 PM Oct 31 in New York is already Nov 1 in UTC.
    const lateOct31 = new Date('2026-11-01T02:00:00.000Z');
    expect(getPoPaymentDateBounds('2026-05-22T15:00:00.000Z', lateOct31)).toMatchObject({
      maxTxnDate: '2026-10-31',
      defaultTxnDate: '2026-10-31',
    });
  });

  test('a PO never issued cannot be paid', () => {
    expect(getPoPaymentDateBounds(null, now)).toBeNull();
    expect(getPoPaymentDateBounds(undefined, now)).toBeNull();
  });
});

describe('the first month a PO can be paid in', () => {
  test('is the month it was issued, on the business calendar', () => {
    // 9 PM Sep 30 in New York is Oct 1 in UTC; the PO belongs to September.
    expect(getPurchaseOrderFirstPaymentPeriod('2026-10-01T01:00:00.000Z')).toEqual({
      year: 2026,
      month: 9,
    });
  });
});

describe('the PO payment form', () => {
  const bounds = { minTxnDate: '2026-05-01', maxTxnDate: '2026-10-31' };
  const schema = createPoManualPaymentFormSchema(1485.18, bounds);
  const values = {
    amount: 10,
    txnDate: '2026-10-19',
    bankAccountId: '',
    reference: '',
    memo: '',
  };

  test('takes any amount up to the balance', () => {
    expect(schema.safeParse(values).success).toBe(true);
    expect(schema.safeParse({ ...values, amount: 1485.18 }).success).toBe(true);
  });

  test('refuses more than the balance, and nothing at all', () => {
    expect(schema.safeParse({ ...values, amount: 1485.19 }).success).toBe(false);
    expect(schema.safeParse({ ...values, amount: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...values, amount: undefined }).success).toBe(false);
  });

  test('takes a date on either end of the range, and refuses one outside it', () => {
    expect(schema.safeParse({ ...values, txnDate: '2026-05-01' }).success).toBe(true);
    expect(schema.safeParse({ ...values, txnDate: '2026-10-31' }).success).toBe(true);
    expect(schema.safeParse({ ...values, txnDate: '2026-04-30' }).success).toBe(false);
    expect(schema.safeParse({ ...values, txnDate: '2026-11-01' }).success).toBe(false);
  });

  test('sends the date alone - no month - a blank bank account as none, and trimmed text', () => {
    expect(
      buildPoManualPaymentPayload({
        ...values,
        txnDate: '2026-09-15',
        reference: '  Check #3617 ',
        memo: ' ',
      })
    ).toEqual({
      amount: 10,
      txnDate: '2026-09-15',
      bankAccountId: null,
      reference: 'Check #3617',
      memo: '',
    });
  });
});
