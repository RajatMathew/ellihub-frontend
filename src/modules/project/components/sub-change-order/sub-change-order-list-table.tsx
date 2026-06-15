import type { Table } from '@tanstack/react-table';
import { ClipboardList } from 'lucide-react';

import { DataGridSection } from '@/app/components/data-grid-section';
import type { SCOListItem } from '@/modules/project/schemas/sub-change-order';

interface SubChangeOrderListTableProps {
  table: Table<SCOListItem>;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function SubChangeOrderListTable({
  table,
  totalCount,
  isLoading,
  isError,
  onRetry,
}: SubChangeOrderListTableProps) {
  return (
    <DataGridSection
      table={table}
      totalCount={totalCount}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Failed to load sub change orders"
      emptyIcon={<ClipboardList className="size-10 text-muted-foreground/50" />}
      emptyTitle="No sub change orders yet"
      emptyDescription="Sub change orders will appear here once created."
      onRetry={onRetry}
      tableLayout={{
        dense: true,
        width: 'auto',
      }}
      tableClassNames={{
        base: 'min-w-full',
      }}
    />
  );
}
