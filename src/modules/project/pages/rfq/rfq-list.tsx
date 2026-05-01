import { useCallback, useMemo, useState } from 'react';

import {
  type SortingState,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useParams } from 'react-router-dom';

import { Card } from '@/app/components/ui/card';
import {
  RFQListConfirmDialogs,
  RFQListFilters,
  RFQListHeader,
  RFQListStats,
  RFQListTable,
  getRFQStatusName,
  getRFQTrackValue,
  useRFQListColumns,
} from '@/modules/project/components/rfq';
import {
  RFQ_DEFAULT_PAGE_SIZE,
  isRFQSortByField,
} from '@/modules/project/constants/rfq';
import {
  useDeleteRFQMutation,
  useGeneratePOMutation,
  useRFQListParams,
  useRFQListQuery,
  useRFQStatusesQuery,
  type RFQListParamPatch,
} from '@/modules/project/hooks/rfq';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import type { ListRFQParams, RFQListItem } from '@/modules/project/schemas/rfq';

export default function RFQListPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    statusFilter,
    trackFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  } = useRFQListParams();

  const filters: ListRFQParams = {
    projectId,
    page,
    size,
    sortBy,
    sortOrder,
    search: searchQuery || undefined,
    statusId: statusFilter,
  };

  const { data, isLoading, isError, refetch } = useRFQListQuery(filters);
  const { data: statuses } = useRFQStatusesQuery();
  const { data: tradeCategories } = useLookupsQuery('TRADE_CATEGORY');
  const { data: allData } = useRFQListQuery({ projectId, size: 100 });
  const { mutate: deleteRFQ, isPending: isDeletePending } = useDeleteRFQMutation();
  const { mutate: generatePO, isPending: isCreatePOPending } = useGeneratePOMutation();
  const [deleteTarget, setDeleteTarget] = useState<RFQListItem | null>(null);
  const [createPOTarget, setCreatePOTarget] = useState<RFQListItem | null>(null);

  const rawListData = useMemo(() => data?.data ?? [], [data?.data]);
  const listData = useMemo(
    () =>
      trackFilter
        ? rawListData.filter((rfq) => getRFQTrackValue(rfq) === trackFilter)
        : rawListData,
    [rawListData, trackFilter],
  );
  const totalCount = trackFilter ? listData.length : (data?.pagination?.totalItems ?? 0);
  const allRfqs = useMemo(() => allData?.data ?? [], [allData?.data]);
  const kpis = useMemo(() => {
    const total = allRfqs.length;
    const active = allRfqs.filter((rfq) => {
      const statusName = getRFQStatusName(rfq);
      return statusName === 'PUBLISHED' || statusName === 'EVALUATION';
    }).length;
    const awarded = allRfqs.filter((rfq) => getRFQStatusName(rfq) === 'AWARDED').length;

    return { total, active, awarded };
  }, [allRfqs]);
  const hasActiveFilters = !!searchQuery || !!statusFilter || !!trackFilter;
  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder],
  );

  const handleDeleteTarget = useCallback((rfq: RFQListItem) => {
    setDeleteTarget(rfq);
  }, []);
  const handleCreatePOTarget = useCallback((rfq: RFQListItem) => {
    setCreatePOTarget(rfq);
  }, []);
  const columns = useRFQListColumns({
    onDelete: handleDeleteTarget,
    onCreatePO: handleCreatePOTarget,
  });
  const pageCount = Math.max(1, Math.ceil(totalCount / size));

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
      const patches: RFQListParamPatch = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }
      if (next.pageSize !== size) {
        patches.size = next.pageSize === RFQ_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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

      const newSortBy = isRFQSortByField(column.id) ? column.id : 'createdAt';
      const newSortOrder = column.desc ? 'desc' : 'asc';
      updateParams({
        sortBy: newSortBy === 'createdAt' ? undefined : newSortBy,
        sortOrder: newSortOrder === 'desc' ? undefined : newSortOrder,
        page: undefined,
      });
    },
  });

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;

    deleteRFQ(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteRFQ, deleteTarget]);

  const handleConfirmCreatePO = useCallback(() => {
    if (!createPOTarget) return;

    generatePO(createPOTarget.id, {
      onSuccess: () => setCreatePOTarget(null),
    });
  }, [createPOTarget, generatePO]);

  return (
    <div className="container-fluid py-7.5">
      <RFQListHeader hasActiveFilters={hasActiveFilters} totalCount={totalCount} />
      <RFQListStats total={kpis.total} active={kpis.active} awarded={kpis.awarded} />

      <Card className="overflow-hidden">
        <RFQListFilters
          trackFilter={trackFilter}
          statusFilter={statusFilter}
          hasActiveFilters={hasActiveFilters}
          searchInput={searchInput}
          tradeCategories={tradeCategories}
          statuses={statuses}
          onSearchChange={handleSearchChange}
          onUpdateParams={updateParams}
          onClearFilters={clearFilters}
        />
        <RFQListTable
          table={table}
          totalCount={totalCount}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
        />
      </Card>

      <RFQListConfirmDialogs
        deleteTarget={deleteTarget}
        createPOTarget={createPOTarget}
        isDeletePending={isDeletePending}
        isCreatePOPending={isCreatePOPending}
        onCloseDelete={() => setDeleteTarget(null)}
        onCloseCreatePO={() => setCreatePOTarget(null)}
        onConfirmDelete={handleConfirmDelete}
        onConfirmCreatePO={handleConfirmCreatePO}
      />
    </div>
  );
}
