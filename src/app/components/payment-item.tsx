import type { ReactNode } from 'react';

import { ImportedPaymentItem } from '@/app/components/imported-payment-item';
import { ManualPaymentItem } from '@/app/components/manual-payment-item';
import {
  isImportedPayment,
  isManualPayment,
  type ImportSource,
  type PaymentSource,
} from '@/app/lib/import-source';
import { QuickBooksPaymentItem } from '@/modules/integrations/components/quickbooks-payment-item';

export interface PaymentItemData {
  amount?: number;
  txnDate?: string | null;
  source?: PaymentSource | null;
  reference?: string | null;
  memo?: string | null;
  checkNumber?: string | null;
  transactionUrl?: string | null;
  bankAccountName?: string | null;
  recordedByName?: string | null;
  importSource?: ImportSource | null;
}

/**
 * One PO payment, as the kind of payment it is: a QuickBooks payment links to
 * its transaction; one loaded from a migration workbook shows its source; one
 * recorded by hand shows what was recorded. `manualAction` - deleting it, say -
 * is offered only on a manual payment, the one kind ElliHub alone owns.
 */
export function PaymentItem({
  payment,
  manualAction,
  onOpen,
}: {
  payment: PaymentItemData;
  manualAction?: ReactNode;
  /** Opens the payment's details. The whole card becomes the control. */
  onOpen?: () => void;
}) {
  const item = renderPaymentItem(payment, manualAction);
  if (!onOpen) return item;

  // The card is the control, but it holds controls of its own - delete, the
  // QuickBooks link - and a button may not contain another. So the opener
  // lies over the card, and those sit above it (`relative z-10` in each item).
  return (
    // The overlay takes the pointer, so the card's own hover is applied from here.
    <div className="relative [&:hover>div:first-child]:bg-surface-hover">
      {item}
      <button
        type="button"
        onClick={onOpen}
        aria-label="View payment details"
        className="absolute inset-0 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function renderPaymentItem(payment: PaymentItemData, manualAction: ReactNode) {
  if (isManualPayment(payment)) {
    return (
      <ManualPaymentItem
        amount={payment.amount}
        txnDate={payment.txnDate}
        reference={payment.reference}
        memo={payment.memo}
        bankAccountName={payment.bankAccountName}
        recordedByName={payment.recordedByName}
        action={manualAction}
      />
    );
  }

  if (isImportedPayment(payment)) {
    return (
      <ImportedPaymentItem
        amount={payment.amount}
        txnDate={payment.txnDate}
        reference={payment.reference}
        memo={payment.memo}
        importSource={payment.importSource}
      />
    );
  }

  return (
    <QuickBooksPaymentItem
      amount={payment.amount}
      txnDate={payment.txnDate}
      checkNumber={payment.checkNumber}
      transactionUrl={payment.transactionUrl}
    />
  );
}
