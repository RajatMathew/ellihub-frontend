import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Switch } from '@/app/components/ui/switch';
import { TableCell, TableRow } from '@/app/components/ui/table';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { PaymentsCell, ToPayCell } from '@/modules/monthly-bills/components/monthly-bills-cells';
import { getMonthPayments, sumPayments } from '@/modules/monthly-bills/lib/monthly-bills-bill';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { CreditCard, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MonthlyBillRowProps {
  bill: MonthlyBillItem;
  projectId: string;
  selectedDate: Date;
  selected: boolean;
  toPay: number;
  ready: boolean;
  canMarkPayment: boolean;
  /** When false, the To Pay / Ready inputs are read-only. */
  editMode: boolean;
  onToggle: (checked: boolean) => void;
  onToPayChange: (value: number) => void;
  onToPayCommit: (value: number) => void;
  onReadyChange: (checked: boolean) => void;
  onMarkPayment: () => void;
}

export function MonthlyBillRow({
  bill,
  projectId,
  selectedDate,
  selected,
  toPay,
  ready,
  canMarkPayment,
  editMode,
  onToggle,
  onToPayChange,
  onToPayCommit,
  onReadyChange,
  onMarkPayment,
}: MonthlyBillRowProps) {
  const { id, poNumber, vendor, issuedAt } = bill.purchaseOrder;
  const paidThisMonth = sumPayments(getMonthPayments(bill, selectedDate));

  return (
    <TableRow data-state={selected ? 'selected' : undefined}>
      <TableCell className="py-3">
        <Checkbox
          size="sm"
          aria-label={`Select ${poNumber}`}
          checked={selected}
          onCheckedChange={(checked) => onToggle(checked === true)}
        />
      </TableCell>
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
      <TableCell className="py-3 text-sm text-muted-foreground">
        {issuedAt
          ? formatDate(issuedAt, { month: '2-digit', day: '2-digit', year: 'numeric' })
          : '—'}
      </TableCell>
      <TableCell className="py-3 text-sm font-medium text-foreground">{vendor.name}</TableCell>
      <TableCell className="py-3">
        <PaymentsCell payments={getMonthPayments(bill, selectedDate)} poNumber={poNumber} />
      </TableCell>
      <TableCell className="py-3 text-right text-sm text-muted-foreground">
        {paidThisMonth > 0 ? formatCurrency(paidThisMonth) : '—'}
      </TableCell>
      <TableCell className="py-3 text-right text-sm font-medium text-foreground">
        {formatCurrency(bill.original)}
      </TableCell>
      <TableCell className="py-3 text-right text-sm text-muted-foreground">
        {formatCurrency(bill.totalPaid)}
      </TableCell>
      <TableCell className="py-3 text-right text-sm font-semibold text-foreground">
        {formatCurrency(bill.balance)}
      </TableCell>
      <TableCell className="py-3 text-right">
        <ToPayCell
          value={toPay}
          poNumber={poNumber}
          disabled={!editMode}
          onChange={onToPayChange}
          onCommit={onToPayCommit}
        />
      </TableCell>
      <TableCell className="py-3 text-center">
        <Switch
          size="sm"
          aria-label={`Mark ${poNumber} ready`}
          checked={ready}
          disabled={!editMode}
          onCheckedChange={onReadyChange}
        />
      </TableCell>
      {canMarkPayment && (
        <TableCell className="py-3 text-center">
          <Button type="button" variant="outline" size="sm" onClick={onMarkPayment}>
            <CreditCard className="size-3.5" />
            Mark Payment
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}
