import { useMemo, useState } from 'react';

import {
  BulkDeleteDialog,
  DataTable,
  f,
  useListState,
  useListTable,
  type ListSelectionConfig,
} from '@/app/components/data-table';
import { Button } from '@/app/components/ui/button';
import { useAccess } from '@/app/contexts/access-context';
import { CostCodeDeleteDialog } from '@/modules/catalog/components/cost-code-delete-dialog';
import { useCostCodeColumns } from '@/modules/catalog/components/cost-codes-columns';
import { CostCodesPageHeader } from '@/modules/catalog/components/cost-codes-page-header';
import { CostCodesStatsBar } from '@/modules/catalog/components/cost-codes-stats-bar';
import { CostCodeFormDialog } from '@/modules/catalog/components/costcode-form-dialog';
import {
  useBulkDeleteCostCodesMutation,
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
import { Tag, Trash2 } from 'lucide-react';

const COST_CODE_DEFAULT_PAGE_SIZE = 10;
const COST_CODE_SORT_BY_OPTIONS = ['name', 'code'] as const;

const COST_CODE_ITEM_LABEL = { many: 'cost codes', one: 'cost code' };

// Module scope, so the selection config keeps one identity for the table's life.
const COST_CODE_SELECTION: ListSelectionConfig<CostCode> = {
  getRowLabel: (costCode) => `${costCode.code} ${costCode.name}`.trim(),
};

export function CostCodesListPage() {
  const { can } = useAccess();
  const canDelete = can('costCode', 'delete');
  const [isBulkDeleteOpen, setBulkDeleteOpen] = useState(false);
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
    canDelete,
    onDelete: setDeleteTarget,
    onEdit: setEditingCostCode,
  });

  const list = useListTable({
    columns,
    getRowId: (costCode) => costCode.id,
    query: costCodesQuery,
    rows: costCodesQuery.data?.data ?? [],
    selection: canDelete ? COST_CODE_SELECTION : undefined,
    state,
    totalCount: costCodesQuery.data?.count ?? 0,
  });

  // Only the records the server actually deleted leave the selection. Anything
  // it refused stays checked so the dialog can name it, which is also why the
  // dialog closes only on a clean run.
  const bulkDelete = useBulkDeleteCostCodesMutation(({ deletedIds, failures }) => {
    list.selection.deselect(deletedIds);
    if (failures.length === 0) setBulkDeleteOpen(false);
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
        bulkItemLabel={COST_CODE_ITEM_LABEL}
        bulkActions={
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        }
        empty={{
          description: 'Click "+ Add Cost Code" to get started.',
          icon: <Tag className="size-10 text-muted-foreground/50" />,
          title: 'No cost codes found',
        }}
        error={{ title: 'Failed to load cost codes' }}
        list={list}
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

      <BulkDeleteDialog
        failures={bulkDelete.failures}
        isPending={bulkDelete.isPending}
        itemLabel={COST_CODE_ITEM_LABEL}
        items={list.selection.items}
        open={isBulkDeleteOpen}
        onConfirm={() => bulkDelete.run(list.selection.ids)}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) bulkDelete.reset();
        }}
      />
    </div>
  );
}
