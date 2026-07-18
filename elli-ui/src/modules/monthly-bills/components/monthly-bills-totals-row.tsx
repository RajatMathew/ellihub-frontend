import { TableCell, TableRow } from '@/app/components/ui/table';
import { formatCurrency } from '@/app/lib/helpers';
import {
  getMonthlyBillRenderedColumns,
  MONTHLY_BILL_VALUE_COLUMNS,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';

interface MonthlyBillsTotals {
  paidThisMonth: number;
  original: number;
  totalPaid: number;
  balance: number;
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
  const valueByColumn: Record<string, number> = {
    payments: totals.paidThisMonth,
    paidThisMonth: totals.paidThisMonth,
    original: totals.original,
    totalPaid: totals.totalPaid,
    balance: totals.balance,
    toPay: totals.toPay,
  };
  const labelColumnKey =
    columns.find((column) => column.key === 'vendor')?.key ??
    columns.find((column) => !isValueColumn(column.key))?.key ??
    columns[0]?.key;
  const hasActions = canMarkPayment;

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell />
      {columns.map((column) => {
        if (column.key === labelColumnKey) {
          return (
            <TableCell key={column.key} className="py-3 text-sm font-semibold text-foreground">
              Totals
            </TableCell>
          );
        }

        if (isValueColumn(column.key)) {
          return (
            <TableCell key={column.key} className="py-3 text-sm font-semibold text-foreground">
              {formatCurrency(valueByColumn[column.key])}
            </TableCell>
          );
        }

        return <TableCell key={column.key} />;
      })}
      {hasActions && <TableCell />}
    </TableRow>
  );
}
