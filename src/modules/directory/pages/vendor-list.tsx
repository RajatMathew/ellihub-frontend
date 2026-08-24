import { useCallback, useMemo, useState } from 'react';

import {
  BulkDeleteDialog,
  DataTable,
  f,
  useListState,
  useListTable,
  type ListSelectionConfig,
} from '@/app/components/data-table';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Button } from '@/app/components/ui/button';
import { useAccess } from '@/app/contexts/access-context';
import { useVendorListColumns, VendorStatsCards } from '@/modules/directory/components/vendors';
import { getVendorTypeOptionLabel } from '@/modules/directory/components/vendors/vendor-list-utils';
import {
  VENDOR_STATUS_LABELS,
  VENDORS_DEFAULT_PAGE_SIZE,
  VENDORS_SORT_BY_OPTIONS,
} from '@/modules/directory/constants/vendors/vendor-list.constants';
import {
  useBulkDeleteVendorsMutation,
  useDeleteVendorMutation,
  useVendorsQuery,
  useVendorStatsQuery,
  useVendorTypesQuery,
} from '@/modules/directory/hooks/vendors.hooks';
import type { ListVendorsParams, Vendor } from '@/modules/directory/schemas/vendor.schema';
import { ListFilterPlus, Package, Plus, Trash2 } from 'lucide-react';

const VENDOR_STATUS_OPTIONS = Object.entries(VENDOR_STATUS_LABELS).map(([value, label]) => ({
  label,
  value,
}));

const VENDOR_ITEM_LABEL = { many: 'vendors', one: 'vendor' };

// Module scope, so the selection config keeps one identity for the table's life.
const VENDOR_SELECTION: ListSelectionConfig<Vendor> = {
  getRowLabel: (vendor) => vendor.name,
};

export function VendorListPage() {
  const { can } = useAccess();
  const canDelete = can('vendor', 'delete');
  const [isBulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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
    canDelete,
    canUpdate: can('vendor', 'update'),
    onDelete: handleDelete,
    typeLabels,
  });

  const list = useListTable({
    columns,
    getRowId: (vendor) => vendor.id,
    query: vendorsQuery,
    rows: vendorsQuery.data?.data ?? [],
    selection: canDelete ? VENDOR_SELECTION : undefined,
    state,
    totalCount: vendorsQuery.data?.pagination?.totalItems ?? 0,
  });

  // Only the records the server actually deleted leave the selection. Anything
  // it refused stays checked so the dialog can name it, which is also why the
  // dialog closes only on a clean run.
  const bulkDelete = useBulkDeleteVendorsMutation(({ deletedIds, failures }) => {
    list.selection.deselect(deletedIds);
    if (failures.length === 0) setBulkDeleteOpen(false);
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
        bulkItemLabel={VENDOR_ITEM_LABEL}
        bulkActions={
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        }
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

      <BulkDeleteDialog
        failures={bulkDelete.failures}
        isPending={bulkDelete.isPending}
        itemLabel={VENDOR_ITEM_LABEL}
        items={list.selection.items}
        open={isBulkDeleteOpen}
        onConfirm={() => bulkDelete.run(list.selection.ids)}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) bulkDelete.reset();
        }}
      />
    </div>
  );
}
