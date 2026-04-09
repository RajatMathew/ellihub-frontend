import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueries } from '@tanstack/react-query';
import { getCoreRowModel, getPaginationRowModel, useReactTable } from '@tanstack/react-table';
import { Edit, Plus } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Button } from '@app/components/ui/button';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import { parsePageParam, parseSizeParam } from '@app/lib/helpers';

import { costCodesApi } from '../api/costcodes.api';
import { CostCodesStatsBar } from '../components/cost-codes-stats-bar';
import { useCostCodeColumns } from '../components/cost-codes-columns';
import { CostCodesTableCard } from '../components/cost-codes-table-card';
import { CostCodeFormDialog } from '../components/costcode-form-dialog';
import { costCodesKeys } from '../constants/costcodes.keys';
import {
  useCostCodeCategoriesQuery,
  useCostCodesQuery,
  useCreateCostCodeMutation,
  useDeleteCostCodeMutation,
  useUpdateCostCodeMutation,
} from '../hooks';
import type { CostCode, CostCodeCreate } from '../schemas/costcode.schema';

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export function CostCodesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parsePageParam(searchParams.get('page'));
  const size = parseSizeParam(searchParams.get('size'), DEFAULT_PAGE_SIZE);
  const searchQuery = searchParams.get('search') ?? '';
  const categoryFilter = searchParams.get('categoryId') ?? undefined;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined || v === '') next.delete(k);
          else next.set(k, v);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ search: value || undefined, page: undefined });
      }, SEARCH_DEBOUNCE_MS);
    },
    [updateParams]
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const { data, isLoading } = useCostCodesQuery({
    page,
    size,
    sortBy: 'name',
    sortOrder: 'asc',
    search: searchQuery || undefined,
    costCodeCategoryId: categoryFilter,
  });
  const { data: categories = [] } = useCostCodeCategoriesQuery();
  const deleteMutation = useDeleteCostCodeMutation();
  const createMutation = useCreateCostCodeMutation();
  const updateMutation = useUpdateCostCodeMutation();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingCostCode, setEditingCostCode] = useState<CostCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CostCode | null>(null);

  const categoryCountQueries = useQueries({
    queries: categories.slice(0, 3).map((cat) => ({
      queryKey: [...costCodesKeys.list(), { costCodeCategoryId: cat.id, size: 1 }],
      queryFn: () => costCodesApi.list({ costCodeCategoryId: cat.id, page: 1, size: 1 }),
    })),
  });

  const listData = data?.data ?? [];
  const totalCount = data?.count ?? 0;
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
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>Cost Codes</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : `Total: ${totalCount}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button size="sm" variant="outline" asChild>
              <Link to="categories">
                <Edit className="size-4" />
                Categories
              </Link>
            </Button>
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus className="size-4" />
              Add Cost Code
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <CostCodesStatsBar
        totalCount={totalCount}
        categories={categories}
        categoryCountQueries={categoryCountQueries}
        className="mb-5 lg:mb-7.5"
      />

      <CostCodesTableCard
        table={table}
        categories={categories}
        categoryFilter={categoryFilter}
        searchInput={searchInput}
        isLoading={isLoading}
        totalCount={totalCount}
        onSearchChange={handleSearchChange}
        onCategoryChange={(id) => updateParams({ categoryId: id, page: undefined })}
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Cost Code"
        description={
          <>
            This will permanently delete <strong>{deleteTarget?.name}</strong>. This cannot be
            undone.
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
