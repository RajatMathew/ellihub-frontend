import { useMemo } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import {
  SubChangeOrderListHeader,
  SubChangeOrderListStats,
  SubChangeOrderMobileCard,
  useSubChangeOrderListColumns,
} from '@/modules/project/components/sub-change-order';
import {
  SCO_STATUS_OPTIONS,
  SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
  SUB_CHANGE_ORDER_SORT_BY_OPTIONS,
} from '@/modules/project/constants/sub-change-order';
import {
  useSCOChangeTypesQuery,
  useSCOsQuery,
  useSCOStatsQuery,
} from '@/modules/project/hooks/sub-change-order';
import type { ListSCOsParams } from '@/modules/project/schemas/sub-change-order';
import { ClipboardList, ListFilterPlus } from 'lucide-react';
import { useParams } from 'react-router-dom';

const STATUS_TABS = f.tabs({ key: 'status', options: [...SCO_STATUS_OPTIONS] });
const SEARCH_FILTER = f.search({ className: 'sm:w-60', placeholder: 'Search SCOs...' });

export function SubChangeOrderListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();

  const { data: changeTypes } = useSCOChangeTypesQuery();

  const changeTypeLabelById = useMemo(
    () =>
      new Map(
        (changeTypes ?? []).map((type) => [
          type.id,
          type.label ?? type.name ?? type.code ?? type.id,
        ])
      ),
    [changeTypes]
  );

  const filters = useMemo(
    () => [
      STATUS_TABS,
      SEARCH_FILTER,
      f.select({
        className: 'sm:w-48',
        icon: ListFilterPlus,
        key: 'changeTypeId',
        options: [...changeTypeLabelById].map(([value, label]) => ({ label, value })),
        placeholder: 'All Change Types',
      }),
    ],
    [changeTypeLabelById]
  );

  const state = useListState({
    filters,
    pageSize: SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
    sort: { by: 'createdAt', fields: SUB_CHANGE_ORDER_SORT_BY_OPTIONS, order: 'desc' },
  });

  const subChangeOrdersQuery = useSCOsQuery({
    ...state.apiParams,
    projectId,
  } as ListSCOsParams);
  const statsQuery = useSCOStatsQuery(projectId);

  const columns = useSubChangeOrderListColumns({ changeTypeLabelById, projectId });

  const list = useListTable({
    columns,
    getRowId: (sco) => sco.id,
    query: subChangeOrdersQuery,
    rows: subChangeOrdersQuery.data?.data ?? [],
    state,
    totalCount: subChangeOrdersQuery.data?.pagination?.totalItems ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);

  return (
    <div className="container-fluid py-7.5">
      <SubChangeOrderListHeader
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        totalCount={list.totalCount}
      />
      <SubChangeOrderListStats isLoading={showStatsInitialLoader} stats={statsQuery.data} />

      <DataTable
        ariaLabel="Sub change orders"
        className="overflow-hidden"
        empty={{
          description: 'Sub change orders will appear here once created.',
          icon: ClipboardList,
          title: 'No sub change orders yet',
        }}
        error={{ title: 'Failed to load sub change orders' }}
        list={list}
        mobileItem={(sco) => (
          <SubChangeOrderMobileCard changeTypeLabelById={changeTypeLabelById} sco={sco} />
        )}
        state={state}
        tableClassNames={{ base: 'min-w-full' }}
        tableLayout={{ dense: true, width: 'auto' }}
      />
    </div>
  );
}
