import { NumberInput } from '@/app/components/ui/number-input';
import { useDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { PaymentsDialog } from '@/modules/monthly-bills/components/payments-dialog';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { useState } from 'react';

interface ToPayCellProps {
  value: number;
  poNumber: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}

/** To Pay input. Updates the row total immediately, but debounces the API save. */
export function ToPayCell({ value, poNumber, disabled, onChange, onCommit }: ToPayCellProps) {
  const debouncedCommit = useDebouncedCallback(onCommit, 600);

  return (
    <NumberInput
      value={value}
      onValueChange={(next) => {
        onChange(next);
        debouncedCommit(next);
      }}
      decimalPlaces={2}
      min={0}
      disabled={disabled}
      aria-label={`To pay for ${poNumber}`}
      className="ml-auto h-8 w-24 text-right"
    />
  );
}

interface PaymentsCellProps {
  payments: MonthlyBillItem['payments'];
  poNumber: string;
}

export function PaymentsCell({ payments, poNumber }: PaymentsCellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-0.5 text-sm">
      {payments.length === 0 ? (
        <span className="font-medium text-primary">No payments yet</span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-primary hover:text-primary/80 hover:underline"
        >
          {payments.length} payment{payments.length === 1 ? '' : 's'}
        </button>
      )}
      {payments.length > 0 && (
        <PaymentsDialog
          open={open}
          onOpenChange={setOpen}
          payments={payments}
          poNumber={poNumber}
        />
      )}
    </div>
  );
}
