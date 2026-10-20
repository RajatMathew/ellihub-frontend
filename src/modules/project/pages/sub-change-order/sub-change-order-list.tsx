import { useMemo, useState } from 'react';

import {
  DataTable,
  f,
  useListState,
  useListTable,
  withPickerData,
} from '@/app/components/data-table';
import {
  useVendorMultiFilterOptions,
  VENDOR_MULTI_FILTER,
} from '@/modules/directory/hooks/vendors/use-vendor-multi-filter-options';
import { ProjectListHeader } from '@/modules/project/components/shared/project-list-header';
import {
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
  PURCHASE_ORDER_MULTI_FILTER,
  usePurchaseOrderFilterOptions,
} from '@/modules/project/hooks/purchase-order';
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

  // Each picker keeps its own search box, which the URL knows nothing about.
  const [vendorSearch, setVendorSearch] = useState('');
  const [purchaseOrderSearch, setPurchaseOrderSearch] = useState('');

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

  const changeTypeFilter = useMemo(
    () =>
      f.select({
        className: 'sm:w-48',
        icon: ListFilterPlus,
        key: 'changeTypeId',
        options: [...changeTypeLabelById].map(([value, label]) => ({ label, value })),
        placeholder: 'All Change Types',
      }),
    [changeTypeLabelById]
  );

  // The pickers are declared without their data, which `withPickerData`
  // attaches for rendering once their queries exist. An SCO's vendor is its
  // purchase order's.
  const filters = useMemo(
    () => [
      STATUS_TABS,
      SEARCH_FILTER,
      VENDOR_MULTI_FILTER,
      PURCHASE_ORDER_MULTI_FILTER,
      changeTypeFilter,
    ],
    [changeTypeFilter]
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

  // Labels come from each picker's own endpoint rather than from the rows: with
  // several values selected, one of them may own no row on this page, and on a
  // deep link none of them do.
  const vendorPicker = useVendorMultiFilterOptions({
    search: vendorSearch,
    selectedIds: state.listValues.vendorId ?? [],
  });
  const purchaseOrderPicker = usePurchaseOrderFilterOptions({
    projectId,
    search: purchaseOrderSearch,
    selectedIds: state.listValues.purchaseOrderId ?? [],
  });

  const renderFilters = useMemo(
    () => [
      STATUS_TABS,
      SEARCH_FILTER,
      withPickerData(VENDOR_MULTI_FILTER, vendorPicker, vendorSearch, setVendorSearch),
      withPickerData(
        PURCHASE_ORDER_MULTI_FILTER,
        purchaseOrderPicker,
        purchaseOrderSearch,
        setPurchaseOrderSearch
      ),
      changeTypeFilter,
    ],
    [changeTypeFilter, purchaseOrderPicker, purchaseOrderSearch, vendorPicker, vendorSearch]
  );

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
      <ProjectListHeader
        resource="subChangeOrder"
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
        filters={renderFilters}
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
