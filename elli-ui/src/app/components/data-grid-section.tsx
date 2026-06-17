import type { ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { CardContent, CardFooter, CardTable } from '@/app/components/ui/card';
import { DataGrid, type DataGridProps } from '@/app/components/ui/data-grid';
import { DataGridPagination } from '@/app/components/ui/data-grid-pagination';
import { DataGridTable } from '@/app/components/ui/data-grid-table';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import type { Table } from '@tanstack/react-table';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface DataGridSectionProps<TData extends object> {
  table: Table<TData>;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  errorTitle: string;
  errorDescription?: string;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry: () => void;
  tableLayout?: DataGridProps<TData>['tableLayout'];
  tableClassNames?: DataGridProps<TData>['tableClassNames'];
  mobileItem?: (row: TData) => ReactNode;
  mobileSkeleton?: ReactNode;
  mobileSkeletonCount?: number;
  mobileListClassName?: string;
}

export function DataGridSection<TData extends object>({
  table,
  totalCount,
  isLoading,
  isError,
  errorTitle,
  errorDescription = 'Something went wrong. Please try again.',
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRetry,
  tableLayout,
  tableClassNames,
  mobileItem,
  mobileSkeleton,
  mobileSkeletonCount,
  mobileListClassName,
}: DataGridSectionProps<TData>) {
  const emptyState = (
    <div className="flex flex-col items-center gap-2 py-8">
      {emptyIcon}
      <p className="text-sm font-medium">{emptyTitle}</p>
      {emptyDescription && <p className="text-xs text-muted-foreground">{emptyDescription}</p>}
      {emptyAction}
    </div>
  );
  const mobileRows = table.getRowModel().rows;
  const resolvedMobileSkeletonCount = Math.min(
    mobileSkeletonCount ?? table.getState().pagination?.pageSize ?? 3,
    4
  );

  if (isError) {
    return (
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="size-10 text-destructive/60" />
          <p className="text-sm font-medium">{errorTitle}</p>
          <p className="text-xs text-muted-foreground">{errorDescription}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCcw className="size-3.5" />
            Retry
          </Button>
        </div>
      </CardContent>
    );
  }

  return (
    <DataGrid
      table={table}
      recordCount={totalCount}
      isLoading={isLoading}
      emptyMessage={emptyState}
      tableLayout={{
        cellBorder: false,
        rowBorder: true,
        headerBackground: true,
        ...tableLayout,
      }}
      tableClassNames={tableClassNames}
    >
      {mobileItem && (
        <CardContent className={cn('min-w-0 p-3 lg:hidden', mobileListClassName)}>
          {isLoading ? (
            <div className="grid min-w-0 gap-2.5">
              {Array.from({ length: resolvedMobileSkeletonCount }).map((_, index) => (
                <div key={`mobile-list-skeleton-${index}`}>
                  {mobileSkeleton ?? <DataGridMobileItemSkeleton />}
                </div>
              ))}
            </div>
          ) : mobileRows.length ? (
            <div className="grid min-w-0 gap-2.5">
              {mobileRows.map((row) => (
                <div key={row.id} className="min-w-0">
                  {mobileItem(row.original)}
                </div>
              ))}
            </div>
          ) : (
            emptyState
          )}
        </CardContent>
      )}
      <CardTable
        className={cn(
          'min-w-0 max-w-full overflow-x-auto overscroll-x-contain',
          mobileItem && 'hidden lg:grid'
        )}
      >
        <DataGridTable />
      </CardTable>
      <CardFooter className="min-w-0 max-w-full overflow-x-auto">
        <DataGridPagination />
      </CardFooter>
    </DataGrid>
  );
}

function DataGridMobileItemSkeleton() {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-28 max-w-full" />
          <Skeleton className="h-3 w-40 max-w-full" />
        </div>
        <Skeleton className="size-7 rounded-md" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-20 rounded-sm" />
        <Skeleton className="h-5 w-24 rounded-sm" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-16 max-w-full" />
            <Skeleton className="h-3.5 w-24 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
