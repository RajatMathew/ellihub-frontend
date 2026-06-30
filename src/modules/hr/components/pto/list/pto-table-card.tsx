import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Card } from '@/app/components/ui/card';
import type { PTO } from '@/modules/hr/schemas/pto.schema';
import type { Table } from '@tanstack/react-table';
import { Calendar } from 'lucide-react';

interface PTOTableCardProps {
  table: Table<PTO>;
  totalCount: number;
  isLoading: boolean;
  isRefreshing?: boolean;
  isError: boolean;
  isRefetching: boolean;
  searchInput: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onRetry: () => void;
}

export function PTOTableCard({
  table,
  totalCount,
  isLoading,
  isRefreshing,
  isError,
  searchInput,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onRetry,
}: PTOTableCardProps) {
  return (
    <Card>
      <TableCardHeader
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            All PTO Requests
          </span>
        }
        actions={
          <TableCardHeaderToolbar>
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search requests..."
              onChange={onSearchChange}
              className="sm:w-72"
            />
            <TableCardHeaderClearButton active={Boolean(searchQuery)} onClick={onClearSearch} />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading || Boolean(isRefreshing)}
        refreshIndicator="none"
        isError={isError}
        errorTitle="Failed to load time off requests."
        emptyIcon={<Calendar className="size-10 text-muted-foreground/40" />}
        emptyTitle="No requests found"
        emptyDescription="Submit a new time off request to start tracking staff leave."
        onRetry={onRetry}
        tableLayout={{
          width: 'fixed',
        }}
      />
    </Card>
  );
}
