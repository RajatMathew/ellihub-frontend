import { Card } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/app/components/ui/table';
import { MonthlyBillsTableHeader } from '@/modules/monthly-bills/components/monthly-bills-table-header';
import {
  MONTHLY_BILL_COLUMNS,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { format } from 'date-fns';

const SKELETON_ROW_COUNT = 3;

const SKELETON_BAR_BY_COLUMN: Record<MonthlyBillColumnKey, string> = {
  poNumber: 'h-3.5 w-36',
  issueDate: 'h-3.5 w-20',
  vendor: 'h-3.5 w-24',
  payments: 'h-3.5 w-28',
  paidThisMonth: 'ml-auto h-3.5 w-16',
  original: 'ml-auto h-3.5 w-20',
  totalPaid: 'ml-auto h-3.5 w-20',
  balance: 'ml-auto h-3.5 w-20',
  toPay: 'ml-auto h-8 w-24 rounded-md',
  ready: 'mx-auto h-5 w-8 rounded-full',
};

interface MonthlyBillsTableSkeletonProps {
  selectedDate: Date;
  canMarkPayment: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
}

export function MonthlyBillsTableSkeleton({
  selectedDate,
  canMarkPayment,
  visibleColumns,
}: MonthlyBillsTableSkeletonProps) {
  const monthName = format(selectedDate, 'MMMM');
  const monthLabel = format(selectedDate, 'MMMM yyyy').toUpperCase();
  const columns = MONTHLY_BILL_COLUMNS.filter((column) => visibleColumns.has(column.key));

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <Skeleton className="h-4 w-48" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {monthLabel}
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-5xl">
          <MonthlyBillsTableHeader
            monthName={monthName}
            canMarkPayment={canMarkPayment}
            visibleColumns={visibleColumns}
          />
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <TableRow key={index} className="hover:bg-transparent">
                <TableCell className="py-3">
                  <Skeleton className="size-4 rounded-sm" />
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key} className="py-3">
                    <Skeleton className={SKELETON_BAR_BY_COLUMN[column.key]} />
                  </TableCell>
                ))}
                {canMarkPayment && (
                  <TableCell className="py-3">
                    <Skeleton className="mx-auto h-8 w-32 rounded-md" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
