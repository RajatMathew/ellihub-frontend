import { useMemo, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { CostCodeDeleteDialog } from '@/modules/catalog/components/cost-code-delete-dialog';
import { useCostCodeColumns } from '@/modules/catalog/components/cost-codes-columns';
import { CostCodesPageHeader } from '@/modules/catalog/components/cost-codes-page-header';
import { CostCodesStatsBar } from '@/modules/catalog/components/cost-codes-stats-bar';
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
import { Tag } from 'lucide-react';

const COST_CODE_DEFAULT_PAGE_SIZE = 10;
const COST_CODE_SORT_BY_OPTIONS = ['name', 'code'] as const;

export function CostCodesListPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCostCode, setEditingCostCode] = useState<CostCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostCode | null>(null);

  const { data: categories = [], isLoading: isCategoriesLoading } = useCostCodeCategoriesQuery();

  // The URL keeps the short `categoryId`; the API expects `costCodeCategoryId`.
  const filters = useMemo(
    () => [
      f.tabs({
        apiKey: 'costCodeCategoryId',
        isLoading: isCategoriesLoading,
        key: 'categoryId',
        options: categories.map((category) => ({ label: category.name, value: category.id })),
      }),
      f.search({ placeholder: 'Search cost codes...' }),
    ],
    [categories, isCategoriesLoading]
  );

  const state = useListState({
    filters,
    pageSize: COST_CODE_DEFAULT_PAGE_SIZE,
    sort: { by: 'name', fields: COST_CODE_SORT_BY_OPTIONS, order: 'asc' },
  });

  const costCodesQuery = useCostCodesQuery(state.apiParams as CostCodeFilters);
  const statsQuery = useCostCodeStatsQuery();
  const deleteMutation = useDeleteCostCodeMutation();
  const createMutation = useCreateCostCodeMutation();
  const updateMutation = useUpdateCostCodeMutation();

  const columns = useCostCodeColumns({
    onDelete: setDeleteTarget,
    onEdit: setEditingCostCode,
  });

  const list = useListTable({
    columns,
    getRowId: (costCode) => costCode.id,
    query: costCodesQuery,
    rows: costCodesQuery.data?.data ?? [],
    state,
    totalCount: costCodesQuery.data?.count ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);

  const closeModal = () => {
    setCreateModalOpen(false);
    setEditingCostCode(null);
  };

  return (
    <div className="container-fluid py-7.5">
      <CostCodesPageHeader
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        totalCount={list.totalCount}
        onCreate={() => setCreateModalOpen(true)}
      />

      <CostCodesStatsBar
        className="mb-5 lg:mb-7.5"
        isLoading={showStatsInitialLoader}
        stats={statsQuery.data}
      />

      <DataTable
        ariaLabel="Cost codes"
        empty={{
          description: 'Click "+ Add Cost Code" to get started.',
          icon: <Tag className="size-10 text-muted-foreground/50" />,
          title: 'No cost codes found',
        }}
        error={{ title: 'Failed to load cost codes' }}
        list={list}
        refreshIndicator="none"
        state={state}
      />

      <CostCodeFormDialog
        costCode={editingCostCode}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        key={editingCostCode?.id ?? 'create'}
        open={createModalOpen || editingCostCode != null}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        onSubmit={(formData) => {
          if ('id' in formData && formData.id) {
            updateMutation.mutate(formData as CostCode, { onSuccess: closeModal });
            return;
          }

          createMutation.mutate(formData as CostCodeCreate, { onSuccess: closeModal });
        }}
      />

      <CostCodeDeleteDialog
        costCode={deleteTarget}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;

          deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
