import type {
  MarkManualPaymentFormData,
  MarkManualPaymentPayload,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';

/**
 * How a bill is paid from Mark Payment: through QuickBooks, which creates the
 * check there, or manually - a check, wire or card paid outside QuickBooks and
 * only recorded in ElliHub.
 */
export type MarkPaymentMode = 'QUICKBOOKS' | 'MANUAL';

/**
 * QuickBooks unless it is not connected, when a QuickBooks payment cannot be
 * made at all. While the connection is still being checked, QuickBooks - the
 * usual case - so the form does not jump once it is known.
 */
export function getDefaultMarkPaymentMode(quickBooks: {
  isConnected: boolean;
  isLoading: boolean;
}): MarkPaymentMode {
  if (quickBooks.isLoading) return 'QUICKBOOKS';
  return quickBooks.isConnected ? 'QUICKBOOKS' : 'MANUAL';
}

/** The manual payment request: the form's values, in the bill's period. */
export function buildManualPaymentPayload(
  values: MarkManualPaymentFormData,
  context: { purchaseOrderId: string; month: number; year: number }
): MarkManualPaymentPayload {
  return {
    purchaseOrderId: context.purchaseOrderId,
    month: context.month,
    year: context.year,
    txnDate: values.txnDate,
    bankAccountId: values.bankAccountId || null,
    reference: values.reference.trim(),
    memo: values.memo.trim(),
  };
}
