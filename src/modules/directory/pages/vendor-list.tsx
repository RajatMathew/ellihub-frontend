import { useCallback, useMemo } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import { useVendorListColumns, VendorStatsCards } from '@/modules/directory/components/vendors';
import { getVendorTypeOptionLabel } from '@/modules/directory/components/vendors/vendor-list-utils';
import {
  VENDOR_STATUS_LABELS,
  VENDORS_DEFAULT_PAGE_SIZE,
  VENDORS_SORT_BY_OPTIONS,
} from '@/modules/directory/constants/vendors/vendor-list.constants';
import {
  useDeleteVendorMutation,
  useVendorsQuery,
  useVendorStatsQuery,
  useVendorTypesQuery,
} from '@/modules/directory/hooks/vendors.hooks';
import type { ListVendorsParams } from '@/modules/directory/schemas/vendor.schema';
import { ListFilterPlus, Package, Plus } from 'lucide-react';

const VENDOR_STATUS_OPTIONS = Object.entries(VENDOR_STATUS_LABELS).map(([value, label]) => ({
  label,
  value,
}));

export function VendorListPage() {
  const { can } = useAccess();

  const { data: typeTabs = [], isLoading: isTypesLoading } = useVendorTypesQuery();

  const filters = useMemo(
    () => [
      f.tabs({
        isLoading: isTypesLoading,
        key: 'type',
        options: typeTabs.map((tab) => ({ label: getVendorTypeOptionLabel(tab), value: tab.id })),
      }),
      f.search({ placeholder: 'Search vendors...' }),
      f.select({
        icon: ListFilterPlus,
        key: 'status',
        options: VENDOR_STATUS_OPTIONS,
        placeholder: 'All Statuses',
      }),
    ],
    [isTypesLoading, typeTabs]
  );

  const state = useListState({
    apiKeys: { size: 'limit' },
    filters,
    pageSize: VENDORS_DEFAULT_PAGE_SIZE,
    sort: { by: 'name', fields: VENDORS_SORT_BY_OPTIONS, order: 'asc' },
  });

  const vendorsQuery = useVendorsQuery(state.apiParams as ListVendorsParams);
  const statsQuery = useVendorStatsQuery();
  const deleteMutation = useDeleteVendorMutation();

  const typeLabels = useMemo(() => {
    const labels = new Map<string, string>();

    for (const type of typeTabs) {
      labels.set(type.id, type.label || type.code || type.id);
    }

    return labels;
  }, [typeTabs]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const columns = useVendorListColumns({
    canDelete: can('vendor', 'delete'),
    canUpdate: can('vendor', 'update'),
    onDelete: handleDelete,
    typeLabels,
  });

  const list = useListTable({
    columns,
    getRowId: (vendor) => vendor.id,
    query: vendorsQuery,
    rows: vendorsQuery.data?.data ?? [],
    state,
    totalCount: vendorsQuery.data?.pagination?.totalItems ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);
  const canCreate = can('vendor', 'create');

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        addIcon={canCreate ? <Plus className="size-4" /> : undefined}
        addLabel={canCreate ? 'Add Vendor' : undefined}
        addTo={canCreate ? 'create' : undefined}
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        resultLabel="Vendors"
        title="Vendors"
        totalCount={list.totalCount}
      />

      <VendorStatsCards
        isLoading={showStatsInitialLoader}
        outstandingBalance={statsQuery.data?.outstandingBalance ?? 0}
        totalCommitted={statsQuery.data?.totalCommitted ?? 0}
        totalPaid={statsQuery.data?.totalPaid ?? 0}
        totalVendors={statsQuery.data?.totalVendors ?? list.totalCount}
      />

      <DataTable
        ariaLabel="Vendors"
        empty={{
          description: 'Click "+ Add Vendor" to get started.',
          icon: <Package className="size-10 text-muted-foreground/50" />,
          title: 'No vendors yet',
        }}
        error={{ title: 'Failed to load vendors' }}
        list={list}
        state={state}
        tableClassNames={{ base: 'min-w-full' }}
        tableLayout={{ width: 'auto' }}
      />
    </div>
  );
}
