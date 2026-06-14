import { TableCell, TableRow } from '@/app/components/ui/table';
import { formatCurrency } from '@/app/lib/helpers';
import {
  MONTHLY_BILL_COLUMNS,
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
  canUpdateBills,
  canMarkPayment,
}: MonthlyBillsTotalsRowProps) {
  const columns = MONTHLY_BILL_COLUMNS.filter((column) => visibleColumns.has(column.key));
  const firstValueIndex = columns.findIndex((column) =>
    MONTHLY_BILL_VALUE_COLUMNS.has(column.key)
  );
  // Columns before the first value column (plus the always-present select column) collapse into a
  // single right-aligned "Totals" label cell, mirroring the original layout.
  const splitIndex = firstValueIndex === -1 ? columns.length : firstValueIndex;
  const valueByColumn: Record<string, number> = {
    paidThisMonth: totals.paidThisMonth,
    totalPaid: totals.totalPaid,
    toPay: totals.toPay,
  };
  const hasActions = canUpdateBills || canMarkPayment;

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={splitIndex + 1}
        className="py-3 text-right text-sm font-semibold text-foreground"
      >
        Totals
      </TableCell>
      {columns.slice(splitIndex).map((column) =>
        MONTHLY_BILL_VALUE_COLUMNS.has(column.key) ? (
          <TableCell
            key={column.key}
            className="py-3 text-right text-sm font-semibold text-foreground"
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
