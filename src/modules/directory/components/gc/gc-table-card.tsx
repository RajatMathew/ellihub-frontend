import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderTabs,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Card } from '@/app/components/ui/card';
import { getGCTypeOptionLabel } from '@/modules/directory/components/gc/gc-list-utils';
import { GC_STATUS_LABELS } from '@/modules/directory/constants/gc/gc-list.constants';
import type { GCStatus, GCType, GeneralContractor } from '@/modules/directory/schemas/gc.schema';
import { type Table } from '@tanstack/react-table';
import { Building2, ListFilterPlus } from 'lucide-react';

interface GCTableCardProps {
  table: Table<GeneralContractor>;
  typeTabs: GCType[];
  gcTypeIdFilter: string | undefined;
  statusFilter: GCStatus | undefined;
  searchInput: string;
  isLoading: boolean;
  isRefreshing?: boolean;
  isTypesLoading: boolean;
  isError: boolean;
  totalCount: number;
  hasActiveFilters: boolean;
  onTypeChange: (typeId: string | undefined) => void;
  onStatusChange: (status: GCStatus | undefined) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

export function GCTableCard({
  table,
  typeTabs,
  gcTypeIdFilter,
  statusFilter,
  searchInput,
  isLoading,
  isRefreshing,
  isTypesLoading,
  isError,
  totalCount,
  hasActiveFilters,
  onTypeChange,
  onStatusChange,
  onSearchChange,
  onClearFilters,
  onRetry,
}: GCTableCardProps) {
  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    ...Object.entries(GC_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <Card>
      <TableCardHeader
        title={
          <TableCardHeaderTabs
            activeValue={gcTypeIdFilter}
            isLoading={isTypesLoading}
            tabs={[
              { label: 'All', value: undefined },
              ...typeTabs.map((tab) => ({
                label: getGCTypeOptionLabel(tab),
                value: tab.id,
              })),
            ]}
            onChange={onTypeChange}
          />
        }
        actions={
          <TableCardHeaderToolbar>
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search GCs..."
              onChange={onSearchChange}
            />
            <TableCardHeaderSelect
              value={statusFilter ?? 'all'}
              placeholder="All Statuses"
              icon={ListFilterPlus}
              options={statusOptions}
              onValueChange={(value) =>
                onStatusChange(value === 'all' ? undefined : (value as GCStatus))
              }
            />
            <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClearFilters} />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading || Boolean(isRefreshing)}
        refreshIndicator="none"
        isError={isError}
        errorTitle="Failed to load general contractors"
        emptyIcon={<Building2 className="size-10 text-muted-foreground/50" />}
        emptyTitle="No general contractors yet"
        emptyDescription={'Click "+ Add GC" to get started.'}
        onRetry={onRetry}
        tableLayout={{
          width: 'auto',
        }}
        tableClassNames={{
          base: 'min-w-full',
        }}
      />
    </Card>
  );
}
