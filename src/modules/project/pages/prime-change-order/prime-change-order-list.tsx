import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/app/components/ui/alert';
import { Input } from '@/app/components/ui/input';
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

const costInputClassName =
  'h-8 w-full rounded-md border-table-card-header-foreground/25 bg-card-header text-xs font-medium text-table-card-header-foreground shadow-xs shadow-black/10 placeholder:text-table-card-header-foreground/75 hover:border-table-card-header-foreground/40 hover:bg-card-header focus-visible:!border-table-card-header-foreground/40 focus-visible:!outline-none focus-visible:!ring-0 sm:w-32';

/**
 * Min/max cost use `f.custom` rather than a dedicated filter kind: this is the
 * only list in the app with a numeric range. Promote it to `f.numberRange` if a
 * second one appears.
 */
function costBoundFilter(key: 'totalCostMin' | 'totalCostMax', label: string) {
  return f.custom({
    key,
    render: ({ value, setValue }) => (
      <Input
        aria-label={label}
        className={costInputClassName}
        min={0}
        placeholder={label}
        step="0.01"
        type="number"
        value={value ?? ''}
        onChange={(event) => setValue(event.target.value || undefined)}
      />
    ),
  });
}

const PRIME_CHANGE_ORDER_FILTERS = [
  f.search({ className: 'sm:w-64', placeholder: 'Search change orders...' }),
  f.select({
    icon: ListFilterPlus,
    key: 'statusName',
    options: PRIME_CHANGE_ORDER_STATUSES.map((status) => ({ label: status, value: status })),
    placeholder: 'All Statuses',
  }),
  costBoundFilter('totalCostMin', 'Min cost'),
  costBoundFilter('totalCostMax', 'Max cost'),
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
            icon: <DatabaseZap className="size-10 text-muted-foreground/50" />,
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
          title={
            <span className="flex items-center font-mono text-xs font-semibold uppercase tracking-[0.08em] !text-table-card-header-foreground">
              Prime Change Orders
            </span>
          }
        />
      </div>
    </div>
  );
}
