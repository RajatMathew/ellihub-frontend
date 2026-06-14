import { Skeleton } from '@/app/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/app/components/ui/table';
import { MonthlyBillsTableHeader } from '@/modules/monthly-bills/components/monthly-bills-table-header';
import {
  MONTHLY_BILL_COLUMNS,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { format } from 'date-fns';

const SKELETON_GROUP_COUNT = 2;
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
  canUpdateBills: boolean;
  canMarkPayment: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
}

export function MonthlyBillsTableSkeleton({
  selectedDate,
  canUpdateBills,
  canMarkPayment,
  visibleColumns,
}: MonthlyBillsTableSkeletonProps) {
  const monthName = format(selectedDate, 'MMMM');
  const columns = MONTHLY_BILL_COLUMNS.filter((column) => visibleColumns.has(column.key));
  const hasActions = canMarkPayment;

  return (
    <div>
      {Array.from({ length: SKELETON_GROUP_COUNT }).map((_, groupIndex) => (
        <div key={groupIndex} className="border-t first:border-t-0">
          <div className="bg-muted/20 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:min-w-[30rem]">
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
              </div>
            </div>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {Array.from({ length: SKELETON_ROW_COUNT }).map((__, index) => (
              <div key={index} className="rounded-md border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="ml-auto h-3 w-16" />
                    <Skeleton className="ml-auto h-4 w-24" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Skeleton className="h-10 rounded-md" />
                  <Skeleton className="h-10 rounded-md" />
                </div>
                <Skeleton className="mt-3 h-9 rounded-md" />
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <Table className="min-w-[1120px]">
              <MonthlyBillsTableHeader
                monthName={monthName}
                canUpdateBills={canUpdateBills}
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
                    {hasActions && (
                      <TableCell className="py-3">
                        <Skeleton className="mx-auto h-8 w-32 rounded-md" />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
