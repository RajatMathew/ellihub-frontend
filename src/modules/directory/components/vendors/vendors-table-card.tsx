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
import { getVendorTypeOptionLabel } from '@/modules/directory/components/vendors/vendor-list-utils';
import { VENDOR_STATUS_LABELS } from '@/modules/directory/constants/vendors/vendor-list.constants';
import type {
  Vendor,
  VendorStatus,
  VendorTypeObject,
} from '@/modules/directory/schemas/vendor.schema';
import { type Table } from '@tanstack/react-table';
import { ListFilterPlus, Package } from 'lucide-react';

interface VendorsTableCardProps {
  table: Table<Vendor>;
  typeTabs: VendorTypeObject[];
  typeFilter: string | undefined;
  statusFilter: VendorStatus | undefined;
  searchInput: string;
  isLoading: boolean;
  isTypesLoading: boolean;
  isError: boolean;
  totalCount: number;
  hasActiveFilters: boolean;
  onTypeChange: (typeId: string | undefined) => void;
  onStatusChange: (status: VendorStatus | undefined) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

export function VendorsTableCard({
  table,
  typeTabs,
  typeFilter,
  statusFilter,
  searchInput,
  isLoading,
  isTypesLoading,
  isError,
  totalCount,
  hasActiveFilters,
  onTypeChange,
  onStatusChange,
  onSearchChange,
  onClearFilters,
  onRetry,
}: VendorsTableCardProps) {
  const typeTabItems = [
    { label: 'All', value: undefined },
    ...typeTabs.map((tab) => ({
      label: getVendorTypeOptionLabel(tab),
      value: tab.id,
    })),
  ];
  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    ...Object.entries(VENDOR_STATUS_LABELS).map(([value, label]) => ({ label, value })),
  ];

  return (
    <Card>
      <TableCardHeader
        title={
          <TableCardHeaderTabs
            activeValue={typeFilter}
            isLoading={isTypesLoading}
            tabs={typeTabItems}
            onChange={onTypeChange}
          />
        }
        actions={
          <TableCardHeaderToolbar>
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search vendors..."
              onChange={onSearchChange}
            />
            <TableCardHeaderSelect
              value={statusFilter ?? 'all'}
              placeholder="All Statuses"
              options={statusOptions}
              icon={ListFilterPlus}
              onValueChange={(value) =>
                onStatusChange(value === 'all' ? undefined : (value as VendorStatus))
              }
            />
            <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClearFilters} />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading}
        refreshIndicator="none"
        isError={isError}
        errorTitle="Failed to load vendors"
        emptyIcon={<Package className="size-10 text-muted-foreground/50" />}
        emptyTitle="No vendors yet"
        emptyDescription={'Click "+ Add Vendor" to get started.'}
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
