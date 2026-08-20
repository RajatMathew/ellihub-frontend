import { useCallback, useMemo } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { useAccess } from '@/app/contexts/access-context';
import { GCStatsCards, useGCListColumns } from '@/modules/directory/components/gc';
import { getGCTypeOptionLabel } from '@/modules/directory/components/gc/gc-list-utils';
import {
  GC_STATUS_LABELS,
  GCS_DEFAULT_PAGE_SIZE,
  GCS_SORT_BY_OPTIONS,
} from '@/modules/directory/constants/gc/gc-list.constants';
import {
  useDeleteGCMutation,
  useGCsQuery,
  useGCStatsQuery,
  useGCTypesQuery,
} from '@/modules/directory/hooks/gc.hooks';
import type { ListGCsParams } from '@/modules/directory/schemas/gc.schema';
import { Building2, ListFilterPlus, Plus } from 'lucide-react';

const GC_STATUS_OPTIONS = Object.entries(GC_STATUS_LABELS).map(([value, label]) => ({
  label,
  value,
}));

export function GCListPage() {
  const { can } = useAccess();

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
    canDelete: can('generalContractor', 'delete'),
    canUpdate: can('generalContractor', 'update'),
    onDelete: handleDelete,
    typeLabels,
  });

  const list = useListTable({
    columns,
    getRowId: (gc) => gc.id,
    query: generalContractorsQuery,
    rows: listData,
    state,
    totalCount: generalContractorsQuery.data?.pagination?.totalItems ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);
  const canCreate = can('generalContractor', 'create');

  // Stats fall back to what is visible when the summary endpoint has no value.
  const visibleActiveProjects = listData.reduce((sum, gc) => sum + (gc.activeProjects ?? 0), 0);
  const visibleCommitted = listData.reduce((sum, gc) => sum + (gc.totalCommitted ?? 0), 0);

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        addIcon={canCreate ? <Plus className="size-4" /> : undefined}
        addLabel={canCreate ? 'Add GC' : undefined}
        addTo={canCreate ? 'create' : undefined}
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        resultLabel="GCs"
        title="General Contractors"
        totalCount={list.totalCount}
      />

      <GCStatsCards
        activeProjects={statsQuery.data?.activeProjects ?? visibleActiveProjects}
        isLoading={showStatsInitialLoader}
        totalCommitted={statsQuery.data?.totalCommitted ?? visibleCommitted}
        totalGCs={statsQuery.data?.totalGCs ?? list.totalCount}
      />

      <DataTable
        ariaLabel="General contractors"
        empty={{
          description: 'Click "+ Add GC" to get started.',
          icon: <Building2 className="size-10 text-muted-foreground/50" />,
          title: 'No general contractors yet',
        }}
        error={{ title: 'Failed to load general contractors' }}
        list={list}
        state={state}
        tableClassNames={{ base: 'min-w-full' }}
        tableLayout={{ width: 'auto' }}
      />
    </div>
  );
}
