import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { TableCell, TableRow } from '@/app/components/ui/table';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { MonthlyBillDetails } from '@/modules/monthly-bills/components/monthly-bill-details';
import {
  PaymentsCell,
  SubChangeOrdersCell,
  ToPayCell,
} from '@/modules/monthly-bills/components/monthly-bills-cells';
import {
  getMonthlyBillRenderedColumns,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { getMonthPayments, sumPayments } from '@/modules/monthly-bills/lib/monthly-bills-bill';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { ChevronRight, CreditCard, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MonthlyBillRowProps {
  bill: MonthlyBillItem;
  projectId: string;
  selectedDate: Date;
  toPay: number;
  ready: boolean;
  canUpdateBills: boolean;
  canMarkPayment: boolean;
  canRecordPayment: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
  isBulkEditing: boolean;
  isAmountEditing: boolean;
  isAmountSaving: boolean;
  isReadySaving: boolean;
  hasAmountChanges: boolean;
  onToPayChange: (value: number) => void;
  onReadyChange: (checked: boolean) => void;
  onAmountEdit: () => void;
  onAmountSave: () => void;
  onMarkPayment: () => void;
}

export function MonthlyBillRow({
  bill,
  projectId,
  selectedDate,
  toPay,
  ready,
  canUpdateBills,
  canMarkPayment,
  canRecordPayment,
  visibleColumns,
  isBulkEditing,
  isAmountEditing,
  isAmountSaving,
  isReadySaving,
  hasAmountChanges,
  onToPayChange,
  onReadyChange,
  onAmountEdit,
  onAmountSave,
  onMarkPayment,
}: MonthlyBillRowProps) {
  const { id, poNumber, vendor, issuedAt } = bill.purchaseOrder;
  const monthPayments = getMonthPayments(bill, selectedDate);
  const paidThisMonth = sumPayments(monthPayments);
  const show = (key: MonthlyBillColumnKey) => visibleColumns.has(key);
  const showVendorInfo = show('vendor') || show('issueDate');
  const showPaymentInfo = show('payments') || show('paidThisMonth');
  const [expanded, setExpanded] = useState(false);
  const colSpan =
    1 + getMonthlyBillRenderedColumns(visibleColumns).length + (canMarkPayment ? 1 : 0);

  return (
    <>
      <TableRow data-state={expanded ? 'selected' : undefined}>
        <TableCell className="py-3">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${poNumber} details` : `Expand ${poNumber} details`}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className={cn('size-4 transition-transform', expanded && 'rotate-90')} />
          </button>
        </TableCell>

        {show('poNumber') && (
          <TableCell className="py-3">
            <div className="flex flex-col items-start gap-0.5">
              <Link
                to={`/app/project/${projectId}/purchase-orders/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
              >
                {poNumber}
                <ExternalLink className="size-3.5" />
              </Link>
              <SubChangeOrdersCell
                subChangeOrders={bill.purchaseOrder.subChangeOrders}
                poNumber={poNumber}
                projectId={projectId}
              />
            </div>
          </TableCell>
        )}
        {showVendorInfo && (
          <TableCell className="min-w-64 py-3">
            <div className="min-w-0">
              {show('vendor') && (
                <p className="break-words text-sm font-medium leading-5 text-foreground">
                  {vendor.name}
                </p>
              )}
              {show('issueDate') && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {issuedAt
                    ? formatDate(issuedAt, { month: '2-digit', day: '2-digit', year: 'numeric' })
                    : 'No issue date'}
                </p>
              )}
            </div>
          </TableCell>
        )}
        {showPaymentInfo && (
          <TableCell className="py-3">
            <div className="flex flex-col items-start gap-0.5">
              {show('payments') && <PaymentsCell payments={monthPayments} poNumber={poNumber} />}
              {show('paidThisMonth') && paidThisMonth > 0 && (
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  Total: {formatCurrency(paidThisMonth)}
                </span>
              )}
              {!show('payments') && paidThisMonth === 0 && (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </TableCell>
        )}
        {show('original') && (
          <TableCell className="py-3 text-sm font-medium text-foreground">
            {formatCurrency(bill.original)}
          </TableCell>
        )}
        {show('totalPaid') && (
          <TableCell className="py-3 text-sm font-medium text-foreground">
            {formatCurrency(bill.totalPaid)}
          </TableCell>
        )}
        {show('balance') && (
          <TableCell className="py-3 text-sm font-semibold text-foreground">
            {formatCurrency(bill.balance)}
          </TableCell>
        )}
        {show('toPay') && (
          <TableCell className="py-3 text-right">
            <ToPayCell
              value={toPay}
              poNumber={poNumber}
              canEdit={canUpdateBills}
              isBulkEditing={isBulkEditing}
              isEditing={isAmountEditing}
              isSaving={isAmountSaving}
              hasChanges={hasAmountChanges}
              onChange={onToPayChange}
              onEdit={onAmountEdit}
              onSave={onAmountSave}
            />
          </TableCell>
        )}
        {show('ready') && (
          <TableCell className="py-3 text-center">
            <Switch
              size="sm"
              aria-label={`Mark ${poNumber} ready`}
              checked={ready}
              disabled={!canUpdateBills || toPay <= 0 || isReadySaving}
              onCheckedChange={onReadyChange}
            />
          </TableCell>
        )}
        {canMarkPayment && (
          <TableCell className="py-3 text-center">
            <div className="flex flex-wrap justify-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canRecordPayment}
                onClick={onMarkPayment}
              >
                <CreditCard className="size-3.5" />
                Mark Payment
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>

      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={colSpan} className="border-l-2 border-primary bg-muted/30 px-6 py-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">Details for {poNumber}</p>
              <MonthlyBillDetails
                bill={bill}
                selectedDate={selectedDate}
                toPay={toPay}
                ready={ready}
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
