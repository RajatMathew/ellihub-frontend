import type { Table } from '@tanstack/react-table';
import { ClipboardList } from 'lucide-react';

import { DataGridSection } from '@/app/components/data-grid-section';
import type { RFQListItem } from '@/modules/project/schemas/rfq';

interface RFQListTableProps {
  table: Table<RFQListItem>;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function RFQListTable({
  table,
  totalCount,
  isLoading,
  isError,
  onRetry,
}: RFQListTableProps) {
  return (
    <DataGridSection
      table={table}
      totalCount={totalCount}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Failed to load RFQs"
      emptyIcon={<ClipboardList className="size-10 text-muted-foreground/50" />}
      emptyTitle="No RFQs yet"
      emptyDescription={'Click "+ Add RFQ" to get started.'}
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
