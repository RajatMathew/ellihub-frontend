import { useCallback, useMemo, useRef, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import {
  getRFQTrackValue,
  RFQListConfirmDialogs,
  RFQListHeader,
  RFQListStats,
  useRFQListColumns,
} from '@/modules/project/components/rfq';
import { ProjectFilterTabs } from '@/modules/project/components/shared';
import { RFQ_DEFAULT_PAGE_SIZE, RFQ_SORT_BY_OPTIONS } from '@/modules/project/constants/rfq';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import {
  useCancelRFQMutation,
  useDeleteRFQMutation,
  useRFQListQuery,
  useRFQStatsQuery,
} from '@/modules/project/hooks/rfq';
import type { ListRFQParams, RFQListItem } from '@/modules/project/schemas/rfq';
import { ChevronRight, ClipboardList, ListFilterPlus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const RFQ_STATUS_FILTER_OPTIONS = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Awarded', value: 'AWARDED' },
];

const SEARCH_FILTER = f.search({ className: 'sm:w-60', placeholder: 'Search RFQs...' });
const STATUS_FILTER = f.select({
  className: 'sm:w-36',
  icon: ListFilterPlus,
  key: 'statusId',
  options: RFQ_STATUS_FILTER_OPTIONS,
  placeholder: 'All Statuses',
});

export default function RFQListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<RFQListItem | null>(null);
  const [voidTarget, setVoidTarget] = useState<RFQListItem | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');

  const trackOptions = useMemo(
    () =>
      (tradeCategories ?? []).map((category) => {
        const label = category.label ?? category.name ?? category.id;

        return { label, value: label };
      }),
    [tradeCategories]
  );

  const scrollTabsForward = useCallback(() => {
    const scrollElement = tabsScrollRef.current;

    if (!scrollElement) return;

    scrollElement.scrollBy({
      behavior: 'smooth',
      left: Math.max(scrollElement.clientWidth * 0.75, 180),
    });
  }, []);

  // Track has no server-side equivalent, so it narrows the page already on
  // screen. Declared hidden because its control lives in the header's title
  // slot rather than alongside the other filters.
  const filters = useMemo(
    () => [
      f.hidden<'track', RFQListItem>({
        clientPredicate: (rfq, value) => getRFQTrackValue(rfq) === value,
        key: 'track',
      }),
      SEARCH_FILTER,
      STATUS_FILTER,
    ],
    []
  );

  const state = useListState({
    filters,
    pageSize: RFQ_DEFAULT_PAGE_SIZE,
    sort: { by: 'createdAt', fields: RFQ_SORT_BY_OPTIONS, order: 'desc' },
  });

  const rfqsQuery = useRFQListQuery({ ...state.apiParams, projectId } as ListRFQParams);
  const statsQuery = useRFQStatsQuery(projectId);
  const { mutate: deleteRFQ, isPending: isDeletePending } = useDeleteRFQMutation();
  const { mutate: voidRFQ, isPending: isVoidPending } = useCancelRFQMutation();

  const columns = useRFQListColumns({
    onCreatePO: useCallback(
      (rfq: RFQListItem) =>
        navigate(`/app/project/${projectId}/purchase-orders/create?rfqId=${rfq.id}`),
      [navigate, projectId]
    ),
    onDelete: useCallback((rfq: RFQListItem) => setDeleteTarget(rfq), []),
    onVoid: useCallback((rfq: RFQListItem) => {
      setVoidTarget(rfq);
      setVoidReason('');
    }, []),
  });

  const list = useListTable({
    columns,
    getRowId: (rfq) => rfq.id,
    query: rfqsQuery,
    rows: rfqsQuery.data?.data ?? [],
    state,
    totalCount: rfqsQuery.data?.pagination?.totalItems ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);

  const closeVoid = useCallback(() => {
    setVoidTarget(null);
    setVoidReason('');
  }, []);

  return (
    <div className="container-fluid py-7.5">
      <RFQListHeader
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        totalCount={list.totalCount}
      />
      <RFQListStats isLoading={showStatsInitialLoader} stats={statsQuery.data} />

      <DataTable
        ariaLabel="RFQs"
        className="overflow-hidden"
        empty={{
          description: 'Click "+ Add RFQ" to get started.',
          icon: <ClipboardList className="size-10 text-muted-foreground/50" />,
          title: 'No RFQs yet',
        }}
        error={{ title: 'Failed to load RFQs' }}
        list={list}
        state={state}
        tableClassNames={{ base: 'min-w-full' }}
        tableLayout={{ width: 'auto' }}
        title={
          <div className="relative flex min-h-11 min-w-0 max-w-full items-stretch overflow-hidden pr-12 sm:w-[min(42vw,36rem)] lg:w-[min(46vw,42rem)] xl:w-[min(48vw,46rem)]">
            <div
              className="flex min-w-0 items-stretch overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              ref={tabsScrollRef}
            >
              <ProjectFilterTabs
                className="w-max min-w-max flex-nowrap pr-16"
                options={[{ label: 'All', value: undefined }, ...trackOptions]}
                value={state.values.track}
                onValueChange={(value) => state.setFilterValue('track', value)}
              />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex w-24 items-center justify-center bg-gradient-to-r from-card-header/0 via-card-header/90 to-card-header">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Scroll for more filters"
                    className="pointer-events-auto flex size-5 cursor-pointer items-center justify-center rounded-full border border-table-card-header-foreground/25 bg-card-header text-table-card-header-foreground/80 shadow-xs shadow-black/10 transition-colors hover:border-table-card-header-foreground/45 hover:text-table-card-header-foreground"
                    type="button"
                    onClick={scrollTabsForward}
                  >
                    <ChevronRight className="size-3.5" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="font-sans text-xs font-medium" side="bottom">
                  Scroll for more filters
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        }
      />

      <RFQListConfirmDialogs
        deleteTarget={deleteTarget}
        isDeletePending={isDeletePending}
        isVoidPending={isVoidPending}
        voidReason={voidReason}
        voidTarget={voidTarget}
        onCloseDelete={() => setDeleteTarget(null)}
        onCloseVoid={closeVoid}
        onConfirmDelete={() => {
          if (!deleteTarget) return;

          deleteRFQ(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
        onConfirmVoid={() => {
          if (!voidTarget) return;

          voidRFQ({ cancellationReason: voidReason, id: voidTarget.id }, { onSuccess: closeVoid });
        }}
        onVoidReasonChange={setVoidReason}
      />
    </div>
  );
}
