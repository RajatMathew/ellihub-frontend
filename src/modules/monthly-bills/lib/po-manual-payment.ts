import { todayDateOnly } from '@/app/lib/dates';
import {
  getCurrentMonthlyBillPeriod,
  MONTHLY_BILL_TIME_ZONE,
  type MonthlyBillPeriod,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import type {
  PoManualPaymentFormData,
  PoManualPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';

export interface PoPaymentDateBounds {
  minTxnDate: string;
  maxTxnDate: string;
  defaultTxnDate: string;
}

function padTwo(value: number) {
  return String(value).padStart(2, '0');
}

function firstDayOf(period: MonthlyBillPeriod) {
  return `${period.year}-${padTwo(period.month)}-01`;
}

function lastDayOf(period: MonthlyBillPeriod) {
  const lastDay = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
  return `${period.year}-${padTwo(period.month)}-${padTwo(lastDay)}`;
}

/**
 * The first monthly bill period a PO can be paid in: the month it was issued,
 * on the business calendar. A PO with no issue date cannot be paid at all.
 */
export function getPurchaseOrderFirstPaymentPeriod(
  issuedAt: string | null | undefined
): MonthlyBillPeriod | null {
  if (!issuedAt) return null;
  const issued = new Date(issuedAt);
  if (Number.isNaN(issued.getTime())) return null;
  // The month on the business calendar, as the server counts it.
  return getCurrentMonthlyBillPeriod(issued);
}

/**
 * The days a payment on the PO may be dated - the payment date decides the
 * Monthly Bills month it counts toward, so these are the server's month rules:
 * from the first of the month the PO was issued to the last of the current
 * month. The form starts on today. Null when the PO was never issued.
 */
export function getPoPaymentDateBounds(
  issuedAt: string | null | undefined,
  now = new Date()
): PoPaymentDateBounds | null {
  const firstPeriod = getPurchaseOrderFirstPaymentPeriod(issuedAt);
  if (!firstPeriod) return null;

  return {
    minTxnDate: firstDayOf(firstPeriod),
    maxTxnDate: lastDayOf(getCurrentMonthlyBillPeriod(now)),
    defaultTxnDate: todayDateOnly(MONTHLY_BILL_TIME_ZONE, now),
  };
}

/** The request for a PO manual payment: the form's values, trimmed. */
export function buildPoManualPaymentPayload(
  values: PoManualPaymentFormData
): PoManualPaymentPayload {
  return {
    amount: values.amount,
    txnDate: values.txnDate,
    bankAccountId: values.bankAccountId || null,
    reference: values.reference.trim(),
    memo: values.memo.trim(),
  };
}
