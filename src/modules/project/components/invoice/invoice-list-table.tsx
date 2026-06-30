import { DataGridSection } from '@/app/components/data-grid-section';
import type { InvoiceListItem } from '@/modules/project/schemas/invoice';
import type { Table } from '@tanstack/react-table';
import { FileText } from 'lucide-react';

interface InvoiceListTableProps {
  table: Table<InvoiceListItem>;
  totalCount: number;
  isLoading: boolean;
  isRefreshing?: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function InvoiceListTable({
  table,
  totalCount,
  isLoading,
  isRefreshing,
  isError,
  onRetry,
}: InvoiceListTableProps) {
  return (
    <DataGridSection
      table={table}
      totalCount={totalCount}
      isLoading={isLoading || Boolean(isRefreshing)}
      refreshIndicator="none"
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
