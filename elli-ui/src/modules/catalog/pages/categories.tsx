import { useMemo, useState } from 'react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { CategoriesTableCard } from '@/modules/catalog/components/categories-table-card';
import { CategoryFormDialog } from '@/modules/catalog/components/category-form-dialog';
import {
  useCostCodeCategoriesQuery,
  useCreateCostCodeCategoryMutation,
  useDeleteCostCodeCategoryMutation,
  useUpdateCostCodeCategoryMutation,
} from '@/modules/catalog/hooks';
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CostCodeCategoriesListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CostCodeCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostCodeCategory | null>(null);
  const [search, setSearch] = useState('');

  /* ---- Queries & Mutations ---- */
  const categoriesQuery = useCostCodeCategoriesQuery();
  const createMutation = useCreateCostCodeCategoryMutation();
  const updateMutation = useUpdateCostCodeCategoryMutation();
  const deleteMutation = useDeleteCostCodeCategoryMutation();
  const categories = categoriesQuery.data ?? [];
  const hasCategoriesData = categoriesQuery.data !== undefined;
  const showCategoriesInitialLoader =
    categoriesQuery.isLoading || (categoriesQuery.isFetching && !hasCategoriesData);
  const isRefreshingCategories =
    hasCategoriesData && categoriesQuery.isFetching && !showCategoriesInitialLoader;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /* ---- Handlers ---- */
  const filteredCategories = useMemo(
    () =>
      search
        ? categories.filter(
            (c) =>
              c.name.toLowerCase().includes(search.toLowerCase()) ||
              (c.description ?? '').toLowerCase().includes(search.toLowerCase())
          )
        : categories,
    [categories, search]
  );

  const handleSubmit = (data: { id?: string; name: string; description?: string | null }) => {
    const payload = {
      name: data.name,
      description: data.description ?? null,
    };

    if ('id' in data && data.id) {
      updateMutation.mutate(
        { ...payload, id: data.id },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingCategory(null);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingCategory(null);
        },
      });
    }
  };

  const handleEdit = (cat: CostCodeCategory) => {
    setEditingCategory(cat);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        title="Cost Code Categories"
        totalCount={categories.length}
        hasActiveFilters={!!search}
        isLoading={showCategoriesInitialLoader}
        actions={
          <>
            <Button size="sm" variant="outline" asChild>
              <Link to="/app/catalog/cost-codes">Back to Cost Codes</Link>
            </Button>
          </>
        }
        addLabel="Add Category"
        addIcon={<Plus className="size-4" />}
        onAdd={openCreate}
      />

      <CategoriesTableCard
        categories={filteredCategories}
        isLoading={showCategoriesInitialLoader}
        isRefreshing={isRefreshingCategories}
        isError={categoriesQuery.isError}
        refetch={categoriesQuery.refetch}
        search={search}
        onSearchChange={setSearch}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
      />

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Category"
        description={
          <>
            This will permanently delete <strong>{deleteTarget?.name}</strong>. Cost codes in this
            category may need to be reassigned.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget)
            deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

export default CostCodeCategoriesListPage;
