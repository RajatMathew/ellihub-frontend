import type { ReactNode } from 'react';

import type { Table } from '@tanstack/react-table';
import { AlertCircle, RefreshCcw } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { CardContent, CardFooter, CardTable } from '@/app/components/ui/card';
import { DataGrid, type DataGridProps } from '@/app/components/ui/data-grid';
import { DataGridPagination } from '@/app/components/ui/data-grid-pagination';
import { DataGridTable } from '@/app/components/ui/data-grid-table';

interface ProjectDataGridSectionProps<TData extends object> {
  table: Table<TData>;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  errorTitle: string;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  onRetry: () => void;
  tableLayout?: DataGridProps<TData>['tableLayout'];
  tableClassNames?: DataGridProps<TData>['tableClassNames'];
}

export function ProjectDataGridSection<TData extends object>({
  table,
  totalCount,
  isLoading,
  isError,
  errorTitle,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onRetry,
  tableLayout,
  tableClassNames,
}: ProjectDataGridSectionProps<TData>) {
  if (isError) {
    return (
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <AlertCircle className="size-10 text-destructive/60" />
          <p className="text-sm font-medium">{errorTitle}</p>
          <p className="text-xs text-muted-foreground">Something went wrong. Please try again.</p>
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
      emptyMessage={
        <div className="flex flex-col items-center gap-2 py-8">
          {emptyIcon}
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="text-xs text-muted-foreground">{emptyDescription}</p>
        </div>
      }
      tableLayout={{
        cellBorder: false,
        rowBorder: true,
        headerBackground: true,
        ...tableLayout,
      }}
      tableClassNames={tableClassNames}
    >
      <CardTable className="overflow-x-auto">
        <DataGridTable />
      </CardTable>
      <CardFooter>
        <DataGridPagination />
      </CardFooter>
    </DataGrid>
  );
}
