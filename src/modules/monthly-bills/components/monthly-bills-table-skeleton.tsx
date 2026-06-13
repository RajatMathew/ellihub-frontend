import { Card } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/app/components/ui/table';
import { MonthlyBillsTableHeader } from '@/modules/monthly-bills/components/monthly-bills-table-header';
import { format } from 'date-fns';

const SKELETON_ROW_COUNT = 3;

interface MonthlyBillsTableSkeletonProps {
  selectedDate: Date;
  canMarkPayment: boolean;
}

export function MonthlyBillsTableSkeleton({
  selectedDate,
  canMarkPayment,
}: MonthlyBillsTableSkeletonProps) {
  const monthName = format(selectedDate, 'MMMM');
  const monthLabel = format(selectedDate, 'MMMM yyyy').toUpperCase();

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
          <MonthlyBillsTableHeader monthName={monthName} canMarkPayment={canMarkPayment} />
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <TableRow key={index} className="hover:bg-transparent">
                <TableCell className="py-3">
                  <Skeleton className="size-4 rounded-sm" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="h-3.5 w-36" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="h-3.5 w-20" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="h-3.5 w-24" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="h-3.5 w-28" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-3.5 w-16" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-3.5 w-20" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-3.5 w-20" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-3.5 w-20" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-8 w-24 rounded-md" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="mx-auto h-5 w-8 rounded-full" />
                </TableCell>
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
