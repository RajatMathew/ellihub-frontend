import { useState } from 'react';

import { NumberInput } from '@/app/components/ui/number-input';
import { cn } from '@/app/lib/utils';
import { PaymentsDialog } from '@/modules/monthly-bills/components/payments-dialog';
import { SubChangeOrdersDialog } from '@/modules/monthly-bills/components/sub-change-orders-dialog';
import type {
  MonthlyBillItem,
  MonthlyBillSubChangeOrder,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';

interface ToPayCellProps {
  value: number;
  poNumber: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: number) => void;
}

/** To Pay input. Updates the row draft immediately; callers decide when to save it. */
export function ToPayCell({
  value,
  poNumber,
  disabled,
  className,
  onChange,
}: ToPayCellProps) {
  return (
    <NumberInput
      value={value}
      onValueChange={(next) => {
        onChange(next);
      }}
      decimalPlaces={2}
      min={0}
      disabled={disabled}
      aria-label={`To pay for ${poNumber}`}
      className={cn('ml-auto h-8 w-24 text-right', className)}
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

interface SubChangeOrdersCellProps {
  subChangeOrders: MonthlyBillSubChangeOrder[];
  poNumber: string;
  projectId: string;
}

/** Trigger shown under the PO number; opens a modal listing the PO's linked sub change orders. */
export function SubChangeOrdersCell({
  subChangeOrders,
  poNumber,
  projectId,
}: SubChangeOrdersCellProps) {
  const [open, setOpen] = useState(false);

  if (subChangeOrders.length === 0) {
    return <span className="text-xs text-muted-foreground">No change orders</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
      >
        {subChangeOrders.length} change order{subChangeOrders.length === 1 ? '' : 's'}
      </button>
      <SubChangeOrdersDialog
        open={open}
        onOpenChange={setOpen}
        subChangeOrders={subChangeOrders}
        poNumber={poNumber}
        projectId={projectId}
      />
    </>
  );
}
