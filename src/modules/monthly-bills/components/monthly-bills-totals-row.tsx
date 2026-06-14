import { TableCell, TableRow } from '@/app/components/ui/table';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import {
  getMonthlyBillRenderedColumns,
  MONTHLY_BILL_VALUE_COLUMNS,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';

interface MonthlyBillsTotals {
  paidThisMonth: number;
  totalPaid: number;
  toPay: number;
}

interface MonthlyBillsTotalsRowProps {
  totals: MonthlyBillsTotals;
  visibleColumns: Set<MonthlyBillColumnKey>;
  canUpdateBills: boolean;
  canMarkPayment: boolean;
}

export function MonthlyBillsTotalsRow({
  totals,
  visibleColumns,
  canMarkPayment,
}: MonthlyBillsTotalsRowProps) {
  const columns = getMonthlyBillRenderedColumns(visibleColumns);
  const isValueColumn = (key: MonthlyBillColumnKey) =>
    (key === 'payments' && visibleColumns.has('paidThisMonth')) ||
    MONTHLY_BILL_VALUE_COLUMNS.has(key);
  const firstValueIndex = columns.findIndex((column) => isValueColumn(column.key));
  // Columns before the first value column (plus the always-present select column) collapse into a
  // single right-aligned "Totals" label cell, mirroring the original layout.
  const splitIndex = firstValueIndex === -1 ? columns.length : firstValueIndex;
  const valueByColumn: Record<string, number> = {
    payments: totals.paidThisMonth,
    paidThisMonth: totals.paidThisMonth,
    totalPaid: totals.totalPaid,
    toPay: totals.toPay,
  };
  const hasActions = canMarkPayment;

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={splitIndex + 1}
        className="py-3 text-right text-sm font-semibold text-foreground"
      >
        Totals
      </TableCell>
      {columns.slice(splitIndex).map((column) =>
        isValueColumn(column.key) ? (
          <TableCell
            key={column.key}
            className={cn(
              'py-3 text-sm font-semibold text-foreground',
              column.key !== 'totalPaid' && 'text-right'
            )}
          >
            {formatCurrency(valueByColumn[column.key])}
          </TableCell>
        ) : (
          <TableCell key={column.key} />
        )
      )}
      {hasActions && <TableCell />}
    </TableRow>
  );
}
