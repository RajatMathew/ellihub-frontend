import type { Table } from '@tanstack/react-table';
import { ClipboardList } from 'lucide-react';

import { ProjectDataGridSection } from '@/modules/project/components/shared';
import type { POListItem } from '@/modules/project/schemas/purchase-order';

interface PurchaseOrderListTableProps {
  table: Table<POListItem>;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function PurchaseOrderListTable({
  table,
  totalCount,
  isLoading,
  isError,
  onRetry,
}: PurchaseOrderListTableProps) {
  return (
    <ProjectDataGridSection
      table={table}
      totalCount={totalCount}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Failed to load purchase orders"
      emptyIcon={<ClipboardList className="size-10 text-muted-foreground/50" />}
      emptyTitle="No purchase orders yet"
      emptyDescription="Purchase orders will appear here once created."
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
