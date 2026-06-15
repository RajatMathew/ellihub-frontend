import { Skeleton } from '@/app/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/app/components/ui/table';
import { MonthlyBillsTableHeader } from '@/modules/monthly-bills/components/monthly-bills-table-header';
import {
  getMonthlyBillRenderedColumns,
  type MonthlyBillColumnKey,
} from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { format } from 'date-fns';

const SKELETON_GROUP_COUNT = 2;
const SKELETON_ROW_COUNT = 3;

const SKELETON_BAR_BY_COLUMN: Record<MonthlyBillColumnKey, string> = {
  poNumber: 'h-3.5 w-28',
  issueDate: 'h-3.5 w-24',
  vendor: 'h-3.5 w-44 max-w-full',
  payments: 'h-3.5 w-28',
  paidThisMonth: 'h-3.5 w-24',
  original: 'h-3.5 w-24',
  totalPaid: 'h-3.5 w-24',
  balance: 'h-3.5 w-24',
  toPay: 'ml-auto h-8 w-32 rounded-md',
  ready: 'mx-auto h-5 w-9 rounded-full',
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
  const columns = getMonthlyBillRenderedColumns(visibleColumns);
  const hasActions = canMarkPayment;

  return (
    <div>
      {Array.from({ length: SKELETON_GROUP_COUNT }).map((_, groupIndex) => (
        <div key={groupIndex} className="border-t first:border-t-0">
          <div className="bg-muted/20 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-full max-w-64" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:min-w-[30rem]">
                <ProjectSummarySkeletonItem />
                <ProjectSummarySkeletonItem />
                <ProjectSummarySkeletonItem />
              </div>
            </div>
          </div>

          <div className="space-y-3 p-3 lg:hidden">
            {Array.from({ length: SKELETON_ROW_COUNT }).map((__, index) => (
              <MonthlyBillMobileCardSkeleton key={index} />
            ))}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <Table className="min-w-230">
              <MonthlyBillsTableHeader
                monthName={monthName}
                canUpdateBills={canUpdateBills}
                canMarkPayment={canMarkPayment}
                visibleColumns={visibleColumns}
              />
              <TableBody>
                {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
                  <MonthlyBillDesktopRowSkeleton
                    key={index}
                    columns={columns}
                    hasActions={hasActions}
                    visibleColumns={visibleColumns}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectSummarySkeletonItem() {
  return (
    <div className="min-w-0 rounded-md border bg-background/80 px-3 py-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-2 h-4 w-24 max-w-full" />
    </div>
  );
}

function MonthlyBillMobileCardSkeleton() {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-28 max-w-full" />
          <Skeleton className="h-3 w-40 max-w-full" />
        </div>
        <div className="shrink-0 space-y-2">
          <Skeleton className="ml-auto h-3 w-14" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-20 max-w-full" />
            <Skeleton className="h-3.5 w-24 max-w-full" />
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0 space-y-1">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 sm:min-w-32">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-9 rounded-full" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-md sm:ml-auto" />
      </div>
    </div>
  );
}

function MonthlyBillDesktopRowSkeleton({
  columns,
  hasActions,
  visibleColumns,
}: {
  columns: ReturnType<typeof getMonthlyBillRenderedColumns>;
  hasActions: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="py-3">
        <Skeleton className="size-6 rounded-md" />
      </TableCell>
      {columns.map((column) => (
        <TableCell key={column.key} className="py-3">
          <MonthlyBillColumnSkeleton column={column.key} visibleColumns={visibleColumns} />
        </TableCell>
      ))}
      {hasActions && (
        <TableCell className="py-3">
          <Skeleton className="mx-auto h-8 w-32 rounded-md" />
        </TableCell>
      )}
    </TableRow>
  );
}

function MonthlyBillColumnSkeleton({
  column,
  visibleColumns,
}: {
  column: MonthlyBillColumnKey;
  visibleColumns: Set<MonthlyBillColumnKey>;
}) {
  if (column === 'poNumber') {
    return (
      <div className="space-y-1.5">
        <Skeleton className={SKELETON_BAR_BY_COLUMN.poNumber} />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
    );
  }

  if (column === 'vendor') {
    return (
      <div className="space-y-1.5">
        {visibleColumns.has('vendor') && <Skeleton className={SKELETON_BAR_BY_COLUMN.vendor} />}
        {visibleColumns.has('issueDate') && (
          <Skeleton className={SKELETON_BAR_BY_COLUMN.issueDate} />
        )}
      </div>
    );
  }

  if (column === 'payments') {
    return (
      <div className="space-y-1.5">
        {visibleColumns.has('payments') && (
          <Skeleton className={SKELETON_BAR_BY_COLUMN.payments} />
        )}
        {visibleColumns.has('paidThisMonth') && (
          <Skeleton className={SKELETON_BAR_BY_COLUMN.paidThisMonth} />
        )}
      </div>
    );
  }

  return <Skeleton className={SKELETON_BAR_BY_COLUMN[column]} />;
}
