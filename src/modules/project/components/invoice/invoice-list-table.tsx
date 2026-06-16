import type { Table } from '@tanstack/react-table';
import { FileText } from 'lucide-react';

import { DataGridSection } from '@/app/components/data-grid-section';
import type { InvoiceListItem } from '@/modules/project/schemas/invoice';

interface InvoiceListTableProps {
  table: Table<InvoiceListItem>;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function InvoiceListTable({
  table,
  totalCount,
  isLoading,
  isError,
  onRetry,
}: InvoiceListTableProps) {
  return (
    <DataGridSection
      table={table}
      totalCount={totalCount}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Failed to load invoices"
      emptyIcon={<FileText className="size-10 text-muted-foreground/50" />}
      emptyTitle="No invoices yet"
      emptyDescription="Invoices will appear here once created."
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
