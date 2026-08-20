import { useMemo, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { CategoryFormDialog } from '@/modules/catalog/components/category-form-dialog';
import { useCategoryListColumns } from '@/modules/catalog/components/category-list-columns';
import {
  useCostCodeCategoriesQuery,
  useCreateCostCodeCategoryMutation,
  useDeleteCostCodeCategoryMutation,
  useUpdateCostCodeCategoryMutation,
} from '@/modules/catalog/hooks';
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import { Plus, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORY_SORT_BY_OPTIONS = ['name', 'description'] as const;

function matchesCategorySearch(category: CostCodeCategory, query: string) {
  const needle = query.toLowerCase();

  return (
    category.name.toLowerCase().includes(needle) ||
    (category.description ?? '').toLowerCase().includes(needle)
  );
}

// The query returns every category at once, so search runs in memory.
const CATEGORY_FILTERS = [
  f.search<CostCodeCategory>({
    clientPredicate: matchesCategorySearch,
    placeholder: 'Search categories...',
  }),
];

export function CostCodeCategoriesListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CostCodeCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostCodeCategory | null>(null);

  const categoriesQuery = useCostCodeCategoriesQuery();
  const createMutation = useCreateCostCodeCategoryMutation();
  const updateMutation = useUpdateCostCodeCategoryMutation();
  const deleteMutation = useDeleteCostCodeCategoryMutation();

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const state = useListState({
    filters: CATEGORY_FILTERS,
    sort: { by: 'name', fields: CATEGORY_SORT_BY_OPTIONS, order: 'asc' },
  });

  const columns = useCategoryListColumns({
    onDelete: setDeleteTarget,
    onEdit: (category) => {
      setEditingCategory(category);
      setDialogOpen(true);
    },
  });

  const list = useListTable({
    columns,
    getRowId: (category) => category.id,
    mode: 'client',
    query: categoriesQuery,
    rows: categories,
    state,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (data: { id?: string; name: string; description?: string | null }) => {
    const payload = { description: data.description ?? null, name: data.name };
    const onSuccess = () => {
      setDialogOpen(false);
      setEditingCategory(null);
    };

    if (data.id) {
      updateMutation.mutate({ ...payload, id: data.id }, { onSuccess });
      return;
    }

    createMutation.mutate(payload, { onSuccess });
  };

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/app/catalog/cost-codes">Back to Cost Codes</Link>
          </Button>
        }
        addIcon={<Plus className="size-4" />}
        addLabel="Add Category"
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        title="Cost Code Categories"
        totalCount={list.totalCount}
        onAdd={() => {
          setEditingCategory(null);
          setDialogOpen(true);
        }}
      />

      <DataTable
        ariaLabel="Cost code categories"
        empty={{
          icon: <Tag className="size-10 text-muted-foreground/50" />,
          title: 'No categories found',
        }}
        error={{
          description: 'There was an error fetching the data. Please try again.',
          title: 'Failed to load categories',
        }}
        list={list}
        state={state}
        title={
          list.isInitialLoading ? (
            <span className="flex items-center">
              <Skeleton className="h-4 w-40" />
            </span>
          ) : (
            <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
              All Categories ({list.totalCount})
            </span>
          )
        }
      />

      <CategoryFormDialog
        category={editingCategory}
        isSubmitting={isSubmitting}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={
          <>
            This will permanently delete <strong>{deleteTarget?.name}</strong>. Cost codes in this
            category may need to be reassigned.
          </>
        }
        isPending={deleteMutation.isPending}
        open={Boolean(deleteTarget)}
        title="Delete Category"
        variant="destructive"
        onConfirm={() => {
          if (!deleteTarget) return;

          deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

export default CostCodeCategoriesListPage;
