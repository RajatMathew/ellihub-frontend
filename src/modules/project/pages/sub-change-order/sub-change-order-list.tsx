import { useMemo } from 'react';

import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { Card } from '@/app/components/ui/card';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
import { formatCurrency } from '@/app/lib/helpers';
import {
  SubChangeOrderListFilters,
  SubChangeOrderListHeader,
  SubChangeOrderListStats,
  SubChangeOrderListTable,
  useSubChangeOrderListColumns,
} from '@/modules/project/components/sub-change-order';
import {
  getSubChangeOrderPurchaseOrderLabel,
  getSubChangeOrderTotalAmount,
} from '@/modules/project/components/sub-change-order/sub-change-order-list-utils';
import {
  isSubChangeOrderSortByField,
  SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE,
} from '@/modules/project/constants/sub-change-order';
import {
  useSCOChangeTypesQuery,
  useSCOsQuery,
  useSCOStatsQuery,
  useSubChangeOrderListParams,
  type SubChangeOrderListParamPatch,
} from '@/modules/project/hooks/sub-change-order';
import type { ListSCOsParams, SCOListItem } from '@/modules/project/schemas/sub-change-order';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Link, useParams } from 'react-router-dom';

type SCOPipelineKey = 'draft' | 'approved' | 'rejected' | 'void';

const SCO_PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<SCOPipelineKey>> = [
  { key: 'draft', label: 'Draft', accent: '#6b6359' },
  { key: 'approved', label: 'Approved', accent: '#2d6a4f' },
  { key: 'rejected', label: 'Rejected', accent: '#dc2626' },
  { key: 'void', label: 'Void', accent: '#9a9286' },
];

function classifySCOStatus(sco: SCOListItem): SCOPipelineKey {
  const raw = sco.status as unknown;
  const candidate =
    (raw && typeof raw === 'object'
      ? ((raw as { name?: string; id?: string }).name ??
        (raw as { name?: string; id?: string }).id)
      : typeof raw === 'string'
        ? raw
        : '') ??
    (sco as unknown as { statusName?: string }).statusName ??
    '';
  const key = String(candidate).trim().toLowerCase();
  if (key === 'approved' || key === 'rejected' || key === 'void') return key;
  return 'draft';
}

export function SubChangeOrderListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    changeTypeFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  } = useSubChangeOrderListParams();

  const filters: ListSCOsParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    status: statusFilter,
    changeTypeId: changeTypeFilter,
  };

  const { data, isLoading, isError, refetch } = useSCOsQuery(filters);
  const { data: stats, isLoading: isStatsLoading } = useSCOStatsQuery(projectId);
  const { data: changeTypes } = useSCOChangeTypesQuery();
  const listData = useMemo(() => data?.data ?? [], [data?.data]);
  const totalCount = data?.pagination?.totalItems ?? 0;
  const hasActiveFilters = !!searchQuery || !!statusFilter || !!changeTypeFilter;
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );
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

  const columns = useSubChangeOrderListColumns({ projectId, changeTypeLabelById });
  const pageCount = Math.max(1, Math.ceil(totalCount / size));

  const [view, setView] = useViewMode<'list' | 'pipeline'>('sub-change-orders', 'list');

  const renderSCOCard = (sco: SCOListItem) => {
    const total = getSubChangeOrderTotalAmount(sco);
    const poLabel = getSubChangeOrderPurchaseOrderLabel(sco);
    return (
      <Link
        to={`${sco.id}`}
        className="block min-w-0 rounded-[2px] border border-zinc-300/70 bg-card p-3 shadow-none transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">
            {sco.scoNumber ?? '-'}
          </span>
        </div>
        {poLabel && poLabel !== '-' && (
          <p className="mt-1 truncate text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            PO {poLabel}
          </p>
        )}
        <div className="mt-3 flex items-end justify-end">
          <span className="truncate text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(total)}
          </span>
        </div>
      </Link>
    );
  };

  const table = useReactTable({
    data: listData,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const prev = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const patches: SubChangeOrderListParamPatch = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size =
          next.pageSize === SUB_CHANGE_ORDER_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
        patches.page = undefined;
      }

      updateParams(patches);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const column = next[0];

      if (!column) {
        updateParams({ sortBy: undefined, sortOrder: undefined, page: undefined });
        return;
      }

      const newSortBy = isSubChangeOrderSortByField(column.id) ? column.id : 'createdAt';
      const newSortOrder = column.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: newSortBy === 'createdAt' ? undefined : newSortBy,
        sortOrder: newSortOrder === 'desc' ? undefined : newSortOrder,
        page: undefined,
      });
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <SubChangeOrderListHeader hasActiveFilters={hasActiveFilters} totalCount={totalCount} />
      <SubChangeOrderListStats stats={stats} isLoading={isStatsLoading} />

      <div className="mb-3 flex justify-end">
        <ViewSwitcher
          views={[
            { key: 'list', label: 'List' },
            { key: 'pipeline', label: 'Pipeline' },
          ]}
          active={view}
          onChange={setView}
        />
      </div>

      <Card className="overflow-hidden">
        <SubChangeOrderListFilters
          statusFilter={statusFilter}
          changeTypeFilter={changeTypeFilter}
          hasActiveFilters={hasActiveFilters}
          searchInput={searchInput}
          changeTypes={changeTypes}
          onSearchChange={handleSearchChange}
          onUpdateParams={updateParams}
          onClearFilters={clearFilters}
        />
        {view === 'list' ? (
          <SubChangeOrderListTable
            table={table}
            totalCount={totalCount}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
          />
        ) : (
          <div className="bg-background p-4">
            <PipelineBoard<SCOListItem, SCOPipelineKey>
              items={listData}
              columns={SCO_PIPELINE_COLUMNS}
              groupOf={classifySCOStatus}
              renderCard={renderSCOCard}
              emptyLabel="No SCOs"
            />
          </div>
        )}
      </Card>
    </div>
  );
}
