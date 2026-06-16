import type { Table } from '@tanstack/react-table';
import { DatabaseZap } from 'lucide-react';

import { DataGridSection } from '@/app/components/data-grid-section';
import type { PrimeChangeOrder } from '@/modules/project/schemas/prime-change-order';

interface PrimeChangeOrderListTableProps {
  table: Table<PrimeChangeOrder>;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function PrimeChangeOrderListTable({
  table,
  totalCount,
  isLoading,
  isError,
  onRetry,
}: PrimeChangeOrderListTableProps) {
  return (
    <DataGridSection
      table={table}
      totalCount={totalCount}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Failed to load change orders"
      emptyIcon={<DatabaseZap className="size-10 text-muted-foreground/50" />}
      emptyTitle="No Fieldwire change orders"
      emptyDescription="Sync this project to pull Prime Change Orders from Fieldwire."
      onRetry={onRetry}
      tableLayout={{
        width: 'auto',
      }}
      tableClassNames={{
        base: 'min-w-full',
      }}
    />
  );
}
