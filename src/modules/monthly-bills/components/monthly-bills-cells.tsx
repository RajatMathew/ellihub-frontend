import { useEffect, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { NumberInput } from '@/app/components/ui/number-input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import { PaymentsDialog } from '@/modules/monthly-bills/components/payments-dialog';
import { SubChangeOrdersDialog } from '@/modules/monthly-bills/components/sub-change-orders-dialog';
import type {
  MonthlyBillItem,
  MonthlyBillSubChangeOrder,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { Loader2, Pencil, Save } from 'lucide-react';

interface ToPayCellProps {
  value: number;
  poNumber: string;
  canEdit?: boolean;
  isBulkEditing?: boolean;
  isEditing?: boolean;
  isSaving?: boolean;
  hasChanges?: boolean;
  className?: string;
  inputClassName?: string;
  onChange: (value: number) => void;
  onEdit?: () => void;
  onSave?: () => void;
}

/** Planned payment input. Updates the row draft immediately; callers decide when to save it. */
export function ToPayCell({
  value,
  poNumber,
  canEdit = false,
  isBulkEditing = false,
  isEditing = false,
  isSaving = false,
  hasChanges = false,
  className,
  inputClassName,
  onChange,
  onEdit,
  onSave,
}: ToPayCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputEnabled = canEdit && (isBulkEditing || isEditing) && !isSaving;
  const showInlineAction = canEdit && !isBulkEditing;

  useEffect(() => {
    if (!inputEnabled || !isEditing || isBulkEditing) return;

    const animationFrame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [inputEnabled, isBulkEditing, isEditing]);

  return (
    <div className={cn('ml-auto flex items-center justify-end gap-1', className)}>
      <NumberInput
        ref={inputRef}
        value={value}
        onValueChange={(next) => {
          onChange(next);
        }}
        decimalPlaces={2}
        min={0}
        disabled={!inputEnabled}
        aria-label={`Planned payment for ${poNumber}`}
        className={cn(
          'h-8 w-24 text-left',
          value > 0 ? 'text-foreground disabled:opacity-100' : 'text-muted-foreground',
          hasChanges && 'border-primary/60',
          inputClassName
        )}
      />
      {showInlineAction &&
        (isEditing ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                mode="icon"
                size="sm"
                disabled={isSaving}
                onClick={onSave}
                aria-label={`Save planned payment amount for ${poNumber}`}
              >
                {isSaving ? (
                  <Loader2 className="size-3.5 animate-spin text-white!" />
                ) : (
                  <Save className="size-3.5 text-white!" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                mode="icon"
                size="sm"
                disabled={isSaving}
                onClick={onEdit}
                aria-label={`Edit planned payment amount for ${poNumber}`}
                className="hover:bg-muted-foreground/10 data-[state=open]:bg-muted-foreground/10"
              >
                <Pencil className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        ))}
    </div>
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
        <span className="font-medium text-muted-foreground">No payments yet</span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer font-medium text-primary hover:text-primary/80 hover:underline"
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
