import { useCallback, useMemo, useState } from 'react';

import {
  BulkDeleteDialog,
  DataTable,
  f,
  useListState,
  useListTable,
  type ListSelectionConfig,
} from '@/app/components/data-table';
import { ListPageHeader } from '@/app/components/page-header';
import { Button } from '@/app/components/ui/button';
import { useAccess } from '@/app/contexts/access-context';
import { GCStatsCards, useGCListColumns } from '@/modules/directory/components/gc';
import { getGCTypeOptionLabel } from '@/modules/directory/components/gc/gc-list-utils';
import {
  GC_STATUS_LABELS,
  GCS_DEFAULT_PAGE_SIZE,
  GCS_SORT_BY_OPTIONS,
} from '@/modules/directory/constants/gc/gc-list.constants';
import {
  useBulkDeleteGCMutation,
  useDeleteGCMutation,
  useGCsQuery,
  useGCStatsQuery,
  useGCTypesQuery,
} from '@/modules/directory/hooks/gc.hooks';
import type { GeneralContractor, ListGCsParams } from '@/modules/directory/schemas/gc.schema';
import { Building2, ListFilterPlus, Plus, Trash2 } from 'lucide-react';

const GC_STATUS_OPTIONS = Object.entries(GC_STATUS_LABELS).map(([value, label]) => ({
  label,
  value,
}));

const GC_ITEM_LABEL = { many: 'general contractors', one: 'general contractor' };

// Module scope, so the selection config keeps one identity for the table's life.
const GC_SELECTION: ListSelectionConfig<GeneralContractor> = {
  getRowLabel: (gc) => gc.name,
};

export function GCListPage() {
  const { can } = useAccess();
  const canDelete = can('generalContractor', 'delete');
  const [isBulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: typeTabs = [], isLoading: isTypesLoading } = useGCTypesQuery();

  const filters = useMemo(
    () => [
      f.tabs({
        isLoading: isTypesLoading,
        key: 'gcTypeId',
        options: typeTabs.map((tab) => ({ label: getGCTypeOptionLabel(tab), value: tab.id })),
      }),
      f.search({ placeholder: 'Search GCs...' }),
      f.select({
        icon: ListFilterPlus,
        key: 'status',
        options: GC_STATUS_OPTIONS,
        placeholder: 'All Statuses',
      }),
    ],
    [isTypesLoading, typeTabs]
  );

  const state = useListState({
    apiKeys: { size: 'limit' },
    filters,
    pageSize: GCS_DEFAULT_PAGE_SIZE,
    sort: { by: 'name', fields: GCS_SORT_BY_OPTIONS, order: 'asc' },
  });

  const generalContractorsQuery = useGCsQuery(state.apiParams as ListGCsParams);
  const statsQuery = useGCStatsQuery();
  const deleteMutation = useDeleteGCMutation();

  const listData = useMemo(
    () => generalContractorsQuery.data?.data ?? [],
    [generalContractorsQuery.data?.data]
  );

  const typeLabels = useMemo(() => {
    const labels = new Map<string, string>();

    for (const type of typeTabs) {
      labels.set(type.id, type.label || type.name || type.code || type.id);
    }

    return labels;
  }, [typeTabs]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const columns = useGCListColumns({
    canDelete,
    canUpdate: can('generalContractor', 'update'),
    onDelete: handleDelete,
    typeLabels,
  });

  const list = useListTable({
    columns,
    getRowId: (gc) => gc.id,
    query: generalContractorsQuery,
    rows: listData,
    selection: canDelete ? GC_SELECTION : undefined,
    state,
    totalCount: generalContractorsQuery.data?.pagination?.totalItems ?? 0,
  });

  // Only the records the server actually deleted leave the selection. Anything
  // it refused stays checked so the dialog can name it, which is also why the
  // dialog closes only on a clean run.
  const bulkDelete = useBulkDeleteGCMutation(({ deletedIds, failures }) => {
    list.selection.deselect(deletedIds);
    if (failures.length === 0) setBulkDeleteOpen(false);
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);
  const canCreate = can('generalContractor', 'create');

  // Stats fall back to what is visible when the summary endpoint has no value.
  const visibleActiveProjects = listData.reduce((sum, gc) => sum + (gc.activeProjects ?? 0), 0);
  const visibleCommitted = listData.reduce((sum, gc) => sum + (gc.totalCommitted ?? 0), 0);

  return (
    <div className="container-fluid py-7.5">
      <ListPageHeader
        title="General Contractors"
        isLoading={list.isInitialLoading}
        summary={{ total: list.totalCount, filtered: state.hasActiveFilters, label: 'GCs' }}
        actions={[
          { label: 'Add GC', icon: Plus, to: 'create', placement: 'primary', enabled: canCreate },
        ]}
      />

      <GCStatsCards
        activeProjects={statsQuery.data?.activeProjects ?? visibleActiveProjects}
        isLoading={showStatsInitialLoader}
        totalCommitted={statsQuery.data?.totalCommitted ?? visibleCommitted}
        totalGCs={statsQuery.data?.totalGCs ?? list.totalCount}
      />

      <DataTable
        ariaLabel="General contractors"
        bulkItemLabel={GC_ITEM_LABEL}
        bulkActions={
          <Button size="toolbar" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
        }
        empty={{
          description: 'Click "+ Add GC" to get started.',
          icon: Building2,
          title: 'No general contractors yet',
        }}
        error={{ title: 'Failed to load general contractors' }}
        list={list}
        state={state}
        tableClassNames={{ base: 'min-w-full' }}
        tableLayout={{ width: 'auto' }}
      />

      <BulkDeleteDialog
        failures={bulkDelete.failures}
        isPending={bulkDelete.isPending}
        itemLabel={GC_ITEM_LABEL}
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
