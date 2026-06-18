import { useState } from 'react';

import { useResourceListParams } from '@/app/hooks/use-resource-list-params';
import { CostCodeDeleteDialog } from '@/modules/catalog/components/cost-code-delete-dialog';
import { useCostCodeColumns } from '@/modules/catalog/components/cost-codes-columns';
import { CostCodesPageHeader } from '@/modules/catalog/components/cost-codes-page-header';
import { CostCodesStatsBar } from '@/modules/catalog/components/cost-codes-stats-bar';
import { CostCodesTableCard } from '@/modules/catalog/components/cost-codes-table-card';
import { CostCodeFormDialog } from '@/modules/catalog/components/costcode-form-dialog';
import {
  useCostCodeCategoriesQuery,
  useCostCodesQuery,
  useCostCodeStatsQuery,
  useCreateCostCodeMutation,
  useDeleteCostCodeMutation,
  useUpdateCostCodeMutation,
} from '@/modules/catalog/hooks';
import type {
  CostCode,
  CostCodeCreate,
  CostCodeFilters,
} from '@/modules/catalog/schemas/costcode.schema';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
type CostCodeSortBy = NonNullable<CostCodeFilters['sortBy']>;

const isCostCodeSortBy = (value: string | null): value is CostCodeSortBy => {
  return value === 'name' || value === 'code';
};

export function CostCodesListPage() {
  const { page, size, searchQuery, searchInput, searchParams, updateParams, handleSearchChange } =
    useResourceListParams({
      defaultPageSize: DEFAULT_PAGE_SIZE,
      defaultSortBy: 'name',
      defaultSortOrder: 'asc',
      searchDebounceMs: SEARCH_DEBOUNCE_MS,
      isSortBy: isCostCodeSortBy,
    });
  const categoryFilter = searchParams.get('categoryId') ?? undefined;

  const costCodesQuery = useCostCodesQuery({
    page,
    size,
    sortBy: 'name',
    sortOrder: 'asc',
    search: searchQuery || undefined,
    costCodeCategoryId: categoryFilter,
  });
  const statsQuery = useCostCodeStatsQuery();
  const { data: categories = [], isLoading: isCategoriesLoading } = useCostCodeCategoriesQuery();
  const deleteMutation = useDeleteCostCodeMutation();
  const createMutation = useCreateCostCodeMutation();
  const updateMutation = useUpdateCostCodeMutation();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCostCode, setEditingCostCode] = useState<CostCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostCode | null>(null);

  const hasListData = costCodesQuery.data !== undefined;
  const hasStatsData = statsQuery.data !== undefined;
  const showListInitialLoader =
    costCodesQuery.isLoading || (costCodesQuery.isFetching && !hasListData);
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);
  const isRefreshingList = hasListData && costCodesQuery.isFetching && !showListInitialLoader;
  const listData = costCodesQuery.data?.data ?? [];
  const totalCount = costCodesQuery.data?.count ?? 0;
  const hasActiveFilters = !!searchQuery || !!categoryFilter;

  const columns = useCostCodeColumns({
    onEdit: setEditingCostCode,
    onDelete: setDeleteTarget,
  });

  const table = useReactTable({
    data: listData,
    columns,
    pageCount: Math.max(1, Math.ceil(totalCount / size)),
    state: { pagination: { pageIndex: page - 1, pageSize: size } },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    onPaginationChange: (updater) => {
      const prev = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const patches: Record<string, string | undefined> = {};
      if (next.pageIndex + 1 !== page)
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      if (next.pageSize !== size) {
        patches.size = next.pageSize === DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
        patches.page = undefined;
      }
      updateParams(patches);
    },
  });

  const closeModal = () => {
    setCreateModalOpen(false);
    setEditingCostCode(null);
  };

  return (
    <div className="container-fluid py-7.5">
      <CostCodesPageHeader
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        isLoading={showListInitialLoader}
        onCreate={() => setCreateModalOpen(true)}
      />

      <CostCodesStatsBar
        isLoading={showStatsInitialLoader}
        stats={statsQuery.data}
        className="mb-5 lg:mb-7.5"
      />

      <CostCodesTableCard
        table={table}
        categories={categories}
        categoryFilter={categoryFilter}
        searchInput={searchInput}
        isLoading={showListInitialLoader}
        isRefreshing={isRefreshingList}
        isCategoriesLoading={isCategoriesLoading}
        isError={costCodesQuery.isError}
        totalCount={totalCount}
        onSearchChange={handleSearchChange}
        onCategoryChange={(id) => updateParams({ categoryId: id, page: undefined })}
        onRetry={() => void costCodesQuery.refetch()}
      />

      <CostCodeFormDialog
        key={editingCostCode?.id ?? 'create'}
        open={createModalOpen || editingCostCode != null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        costCode={editingCostCode}
        onSubmit={(formData) => {
          if ('id' in formData && formData.id) {
            updateMutation.mutate(formData as CostCode, { onSuccess: closeModal });
          } else {
            createMutation.mutate(formData as CostCodeCreate, { onSuccess: closeModal });
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <CostCodeDeleteDialog
        costCode={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget)
            deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
