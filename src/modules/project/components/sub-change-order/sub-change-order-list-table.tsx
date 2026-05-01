import type { Table } from '@tanstack/react-table';
import { ClipboardList } from 'lucide-react';

import { ProjectDataGridSection } from '@/modules/project/components/shared';
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
    <ProjectDataGridSection
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
      }}
      tableClassNames={{
        base: 'min-w-max',
      }}
    />
  );
}
