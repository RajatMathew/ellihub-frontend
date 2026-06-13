import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { TableCell, TableRow } from '@/app/components/ui/table';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { PaymentsCell, ToPayCell } from '@/modules/monthly-bills/components/monthly-bills-cells';
import type { MonthlyBillColumnKey } from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { getMonthPayments, sumPayments } from '@/modules/monthly-bills/lib/monthly-bills-bill';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { ChevronRight, CreditCard, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface MonthlyBillRowProps {
  bill: MonthlyBillItem;
  projectId: string;
  selectedDate: Date;
  toPay: number;
  ready: boolean;
  canMarkPayment: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
  /** When false, the To Pay / Ready inputs are read-only. */
  editMode: boolean;
  onToPayChange: (value: number) => void;
  onToPayCommit: (value: number) => void;
  onReadyChange: (checked: boolean) => void;
  onMarkPayment: () => void;
}

export function MonthlyBillRow({
  bill,
  projectId,
  selectedDate,
  toPay,
  ready,
  canMarkPayment,
  visibleColumns,
  editMode,
  onToPayChange,
  onToPayCommit,
  onReadyChange,
  onMarkPayment,
}: MonthlyBillRowProps) {
  const { id, poNumber, vendor, issuedAt } = bill.purchaseOrder;
  const paidThisMonth = sumPayments(getMonthPayments(bill, selectedDate));
  const show = (key: MonthlyBillColumnKey) => visibleColumns.has(key);
  const [expanded, setExpanded] = useState(false);
  // Chevron column + visible data columns + optional Mark Payment column.
  const colSpan = 1 + visibleColumns.size + (canMarkPayment ? 1 : 0);

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
          <Link
            to={`/app/project/${projectId}/purchase-orders/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
          >
            {poNumber}
            <ExternalLink className="size-3.5" />
          </Link>
        </TableCell>
      )}
      {show('issueDate') && (
        <TableCell className="py-3 text-sm text-muted-foreground">
          {issuedAt
            ? formatDate(issuedAt, { month: '2-digit', day: '2-digit', year: 'numeric' })
            : '—'}
        </TableCell>
      )}
      {show('vendor') && (
        <TableCell className="py-3 text-sm font-medium text-foreground">{vendor.name}</TableCell>
      )}
      {show('payments') && (
        <TableCell className="py-3">
          <PaymentsCell payments={getMonthPayments(bill, selectedDate)} poNumber={poNumber} />
        </TableCell>
      )}
      {show('paidThisMonth') && (
        <TableCell className="py-3 text-right text-sm text-muted-foreground">
          {paidThisMonth > 0 ? formatCurrency(paidThisMonth) : '—'}
        </TableCell>
      )}
      {show('original') && (
        <TableCell className="py-3 text-right text-sm font-medium text-foreground">
          {formatCurrency(bill.original)}
        </TableCell>
      )}
      {show('totalPaid') && (
        <TableCell className="py-3 text-right text-sm text-muted-foreground">
          {formatCurrency(bill.totalPaid)}
        </TableCell>
      )}
      {show('balance') && (
        <TableCell className="py-3 text-right text-sm font-semibold text-foreground">
          {formatCurrency(bill.balance)}
        </TableCell>
      )}
      {show('toPay') && (
        <TableCell className="py-3 text-right">
          <ToPayCell
            value={toPay}
            poNumber={poNumber}
            disabled={!editMode}
            onChange={onToPayChange}
            onCommit={onToPayCommit}
          />
        </TableCell>
      )}
      {show('ready') && (
        <TableCell className="py-3 text-center">
          <Switch
            size="sm"
            aria-label={`Mark ${poNumber} ready`}
            checked={ready}
            disabled={!editMode}
            onCheckedChange={onReadyChange}
          />
        </TableCell>
      )}
      {canMarkPayment && (
        <TableCell className="py-3 text-center">
          <Button type="button" variant="outline" size="sm" onClick={onMarkPayment}>
            <CreditCard className="size-3.5" />
            Mark Payment
          </Button>
        </TableCell>
      )}
      </TableRow>

      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={colSpan} className="border-l-2 border-primary bg-muted/30 px-6 py-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Details for {poNumber}</p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. This is placeholder content
                for the expanded bill view — line items, payment history, and notes will go here.
              </p>
              <p>Vendor: {vendor.name}</p>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
