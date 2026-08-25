import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/app/components/ui/alert';
import { formatCurrency } from '@/app/lib/helpers';
import {
  PrimeChangeOrderListHeader,
  PrimeChangeOrderNotConnected,
  PrimeChangeOrderStatusSummary,
  usePrimeChangeOrderListColumns,
} from '@/modules/project/components/prime-change-order';
import {
  PRIME_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
  PRIME_CHANGE_ORDER_SORT_BY_OPTIONS,
} from '@/modules/project/constants/prime-change-order';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import {
  usePrimeChangeOrdersQuery,
  usePrimeChangeOrderStatusSummaryQuery,
  usePrimeChangeOrderSyncStatusQuery,
  useSyncPrimeChangeOrdersMutation,
} from '@/modules/project/hooks/prime-change-order';
import {
  PRIME_CHANGE_ORDER_STATUSES,
  type ListPrimeChangeOrderParams,
} from '@/modules/project/schemas/prime-change-order';
import { AlertCircle, DatabaseZap, ListFilterPlus } from 'lucide-react';
import { useParams } from 'react-router-dom';

const PRIME_CHANGE_ORDER_FILTERS = [
  f.search({ className: 'sm:w-64', placeholder: 'Search change orders...' }),
  f.select({
    icon: ListFilterPlus,
    key: 'statusName',
    options: PRIME_CHANGE_ORDER_STATUSES.map((status) => ({ label: status, value: status })),
    placeholder: 'All Statuses',
  }),
  f.numberRange({
    description: 'Set a minimum and maximum amount.',
    formatValue: (value) => formatCurrency(Number(value)),
    key: 'totalCostMin',
    label: 'Cost',
    maxLabel: 'Max cost',
    minLabel: 'Min cost',
    placeholder: 'Cost range',
    prefix: '$',
    step: '0.01',
    toKey: 'totalCostMax',
  }),
];

export function PrimeChangeOrderListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();

  const state = useListState({
    filters: PRIME_CHANGE_ORDER_FILTERS,
    pageSize: PRIME_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
    sort: {
      by: 'fieldwireUpdatedAt',
      fields: PRIME_CHANGE_ORDER_SORT_BY_OPTIONS,
      order: 'desc',
    },
  });

  const primeChangeOrdersQuery = usePrimeChangeOrdersQuery({
    ...state.apiParams,
    projectId,
  } as ListPrimeChangeOrderParams);
  const { data: projectDetail } = useProjectDetailQuery(projectId);
  const statusSummaryQuery = usePrimeChangeOrderStatusSummaryQuery(projectId);
  const syncStatusQuery = usePrimeChangeOrderSyncStatusQuery(projectId);
  const syncMutation = useSyncPrimeChangeOrdersMutation();

  const columns = usePrimeChangeOrderListColumns();

  const syncStatusQueryLoading = syncStatusQuery.isLoading;

  const list = useListTable({
    columns,
    extraLoading: syncStatusQueryLoading,
    getRowId: (changeOrder) => changeOrder.id,
    query: primeChangeOrdersQuery,
    rows: primeChangeOrdersQuery.data?.data ?? [],
    state,
    totalCount: primeChangeOrdersQuery.data?.pagination?.totalItems ?? 0,
  });

  const hasStatusSummaryData = statusSummaryQuery.data !== undefined;
  const showStatusSummaryInitialLoader =
    statusSummaryQuery.isLoading || (statusSummaryQuery.isFetching && !hasStatusSummaryData);

  const syncStatus = syncStatusQuery.data;
  const isMapped = Boolean(syncStatus?.fieldwireProjectId);
  const syncDisabled = !isMapped || syncMutation.isPending || syncStatusQuery.isLoading;

  return (
    <div className="container-fluid py-7.5">
      <div>
        <PrimeChangeOrderListHeader
          fieldwireProjectName={projectDetail?.fieldwireProjectName}
          hasActiveFilters={state.hasActiveFilters}
          isLoading={list.isInitialLoading}
          isMapped={isMapped}
          isSyncDisabled={syncDisabled}
          isSyncPending={syncMutation.isPending}
          projectId={projectId}
          syncStatus={syncStatus}
          totalCount={list.totalCount}
          onSync={() => syncMutation.mutate(projectId)}
        />

        {syncStatus?.syncStatus.lastSyncError && (
          <Alert appearance="light" className="mb-5" variant="destructive">
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertTitle>Last sync failed</AlertTitle>
              <AlertDescription>{syncStatus.syncStatus.lastSyncError}</AlertDescription>
            </AlertContent>
          </Alert>
        )}

        <PrimeChangeOrderStatusSummary
          isLoading={showStatusSummaryInitialLoader}
          statusFilter={state.values.statusName}
          statusSummary={statusSummaryQuery.data}
          onStatusChange={(statusName) => state.setFilterValue('statusName', statusName)}
        />

        <DataTable
          ariaLabel="Prime change orders"
          className="overflow-hidden"
          empty={{
            description: 'Sync this project to pull Prime Change Orders from Fieldwire.',
            icon: DatabaseZap,
            title: 'No Fieldwire change orders',
          }}
          error={{ title: 'Failed to load change orders' }}
          list={list}
          replaceBody={
            !isMapped && !syncStatusQuery.isLoading ? (
              <PrimeChangeOrderNotConnected projectId={projectId} />
            ) : undefined
          }
          state={state}
          tableClassNames={{ base: 'min-w-full' }}
          tableLayout={{ width: 'auto' }}
          title="Prime Change Orders"
        />
      </div>
    </div>
  );
}
