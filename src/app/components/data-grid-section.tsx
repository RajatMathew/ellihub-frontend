import { useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';

import { renderRowSelectionCheckbox } from '@/app/components/data-table/data-table-selection';
import { Button } from '@/app/components/ui/button';
import { CardContent, CardFooter, CardTable } from '@/app/components/ui/card';
import { DataGrid, type DataGridProps } from '@/app/components/ui/data-grid';
import { DataGridPagination } from '@/app/components/ui/data-grid-pagination';
import { DataGridTable } from '@/app/components/ui/data-grid-table';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import type { Table } from '@tanstack/react-table';
import { AlertCircle, Loader2, RefreshCcw, type LucideProps } from 'lucide-react';

export interface DataGridSectionProps<TData extends object> {
  table: Table<TData>;
  /** Accessible name for the rendered <table>. Required, as on `DataGridProps`. */
  tableAriaLabel: string;
  totalCount: number;
  isLoading: boolean;
  isRefreshing?: boolean;
  refreshIndicator?: 'inline' | 'none';
  isError: boolean;
  errorTitle: string;
  errorDescription?: string;
  /** The icon component. Sized and tinted here so every empty state matches. */
  emptyIcon: ComponentType<LucideProps>;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry: () => void;
  tableLayout?: DataGridProps<TData>['tableLayout'];
  tableClassNames?: DataGridProps<TData>['tableClassNames'];
  /**
   * Card-per-row rendering below the breakpoint. The second argument is the
   * row's selection checkbox, or null when the table has no selection — the
   * column lives in the table, which is not rendered at this width.
   */
  mobileItem?: (row: TData, selectionCheckbox: ReactNode) => ReactNode;
  mobileSkeleton?: ReactNode;
  mobileSkeletonCount?: number;
  mobileListClassName?: string;
  mobileBreakpoint?: 'lg' | 'xl' | '2xl';
}

const responsiveListClasses = {
  lg: {
    mobile: 'lg:hidden',
    table: 'hidden lg:grid',
  },
  xl: {
    mobile: 'xl:hidden',
    table: 'hidden xl:grid',
  },
  '2xl': {
    mobile: '2xl:hidden',
    table: 'hidden 2xl:grid',
  },
} as const;

export function DataGridSection<TData extends object>({
  table,
  tableAriaLabel,
  totalCount,
  isLoading,
  isRefreshing = false,
  refreshIndicator = 'inline',
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
  mobileBreakpoint = 'lg',
}: DataGridSectionProps<TData>) {
  const responsiveClasses = responsiveListClasses[mobileBreakpoint];
  const EmptyIcon = emptyIcon;

  // Remember how tall the body was the last time it held rows, and hold that
  // height while the next result set loads.
  //
  // Two jumps come from not doing this. The skeleton always drew `pageSize`
  // rows, so a filtered result of three collapsed a ten-row card the moment it
  // landed; and the reverse on the way back in. Measuring beats counting rows,
  // because rows are not all one height — a two-line name cell is taller than a
  // date.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [lastBodyHeight, setLastBodyHeight] = useState<number>();
  const hasRows = table.getRowModel().rows.length > 0;

  useLayoutEffect(() => {
    if (isLoading || !hasRows || !bodyRef.current) return;

    const height = bodyRef.current.offsetHeight;

    // Zero means the table is not the visible layout — below the mobile
    // breakpoint the card grid renders instead and this element is hidden.
    // Holding a height of nothing would be worse than holding none.
    if (height > 0) setLastBodyHeight(height);
  }, [hasRows, isLoading, totalCount]);

  // Only while loading. Once rows are on screen the body sizes itself, or an
  // empty state would be padded out to the height of the last full page.
  const bodyMinHeight = isLoading ? lastBodyHeight : undefined;
  const emptyState = (
    <div className="flex flex-col items-center gap-2 py-8">
      <EmptyIcon className="size-10 text-muted-foreground/50" />
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
      tableAriaLabel={tableAriaLabel}
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
      {/* Overlaid, not inserted. This used to be a 36px bar in the flow between
          the table and the footer, so every background refetch pushed the
          pagination row down and pulled it back up again. */}
      {refreshIndicator === 'inline' && (
        <div
          aria-live="polite"
          className={cn(
            // Anchored to the bottom, above the footer. The card's first child
            // is the header, so a top-anchored overlay lands on top of Clear.
            'pointer-events-none absolute bottom-16 end-4 z-20 transition-opacity duration-150',
            isRefreshing && !isLoading ? 'opacity-100' : 'opacity-0'
          )}
        >
          <span className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs font-medium text-muted-foreground shadow-xs">
            <Loader2 className="size-3.5 animate-spin" />
            Refreshing
          </span>
        </div>
      )}
      {mobileItem && (
        <CardContent className={cn('min-w-0 p-3', responsiveClasses.mobile, mobileListClassName)}>
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
                  {mobileItem(row.original, renderRowSelectionCheckbox(row))}
                </div>
              ))}
            </div>
          ) : (
            emptyState
          )}
        </CardContent>
      )}
      <CardTable
        ref={bodyRef}
        className={cn(
          'min-w-0 max-w-full overflow-x-auto overscroll-x-contain [scrollbar-gutter:stable]',
          mobileItem && responsiveClasses.table
        )}
        // Holds the body's height across a refetch, so a shorter result set
        // cannot collapse the card before the new rows paint.
        style={bodyMinHeight ? { minHeight: bodyMinHeight } : undefined}
      >
        <DataGridTable />
      </CardTable>
      {/* The footer is not a second scroll region: the pagination wraps instead. */}
      <CardFooter className="min-w-0 max-w-full">
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
