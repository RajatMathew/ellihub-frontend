import { useMemo, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { LookupFormDialog } from '@/modules/lookup/components/lookup-form-dialog';
import { useLookupListColumns } from '@/modules/lookup/components/lookup-list-columns';
import {
  useCreateLookupMutation,
  useDeleteLookupMutation,
  useLookupsQuery,
  useUpdateLookupMutation,
} from '@/modules/lookup/hooks';
import type { Lookup, LookupCreate, LookupUpdate } from '@/modules/lookup/schemas/lookup.schema';
import { ListFilterPlus, Plus, Tag } from 'lucide-react';

const LOOKUP_SORT_BY_OPTIONS = ['type', 'label'] as const;

function matchesLookupSearch(lookup: Lookup, query: string) {
  const needle = query.toLowerCase();

  return (
    lookup.type.toLowerCase().includes(needle) ||
    (lookup.label ?? '').toLowerCase().includes(needle)
  );
}

export function LookupListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLookup, setEditingLookup] = useState<Lookup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lookup | null>(null);

  const lookupsQuery = useLookupsQuery();
  const createMutation = useCreateLookupMutation();
  const updateMutation = useUpdateLookupMutation();
  const deleteMutation = useDeleteLookupMutation();

  const lookups = useMemo(() => lookupsQuery.data ?? [], [lookupsQuery.data]);
  const allTypes = useMemo(
    () => [...new Set(lookups.map((lookup) => lookup.type))].sort(),
    [lookups]
  );

  // The whole collection arrives in one query, so both filters run in memory.
  // Options depend on the data, so the schema is memoized rather than hoisted.
  const filters = useMemo(
    () => [
      f.select<'type', string, Lookup>({
        clientPredicate: (lookup, value) => lookup.type === value,
        icon: ListFilterPlus,
        key: 'type',
        options: allTypes.map((type) => ({ label: type, value: type })),
        placeholder: 'All Types',
      }),
      f.search<Lookup>({
        clientPredicate: matchesLookupSearch,
        placeholder: 'Search lookups...',
      }),
    ],
    [allTypes]
  );

  const state = useListState({
    filters,
    sort: { by: 'type', fields: LOOKUP_SORT_BY_OPTIONS, order: 'asc' },
  });

  const columns = useLookupListColumns({
    onDelete: setDeleteTarget,
    onEdit: (lookup) => {
      setEditingLookup(lookup);
      setDialogOpen(true);
    },
  });

  const list = useListTable({
    columns,
    getRowId: (lookup) => lookup.id,
    mode: 'client',
    query: lookupsQuery,
    rows: lookups,
    state,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const typeFilter = state.values.type;

  const handleSubmit = (data: LookupCreate | LookupUpdate) => {
    const onSuccess = () => {
      setDialogOpen(false);
      setEditingLookup(null);
    };

    if ('id' in data && data.id) {
      updateMutation.mutate(data as LookupUpdate, { onSuccess });
      return;
    }

    createMutation.mutate(data as LookupCreate, { onSuccess });
  };

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        addIcon={<Plus className="size-4" />}
        addLabel="Add Lookup"
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        title="Lookups"
        totalCount={list.totalCount}
        onAdd={() => {
          setEditingLookup(null);
          setDialogOpen(true);
        }}
      />

      <DataTable
        ariaLabel="Lookups"
        empty={{
          icon: <Tag className="size-10 text-muted-foreground/50" />,
          title: 'No lookups found',
        }}
        error={{
          description: 'There was an error fetching the data. Please try again.',
          title: 'Failed to load lookups',
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
              {typeFilter
                ? `${typeFilter} (${list.totalCount})`
                : `All Lookups (${list.totalCount})`}
            </span>
          )
        }
      />

      <LookupFormDialog
        isSubmitting={isSubmitting}
        lookup={editingLookup}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        confirmLabel="Delete"
        description={
          <>
            This will permanently delete{' '}
            <strong>{deleteTarget?.label ?? deleteTarget?.type}</strong>. Any references to this
            lookup value may need to be updated.
          </>
        }
        isPending={deleteMutation.isPending}
        open={Boolean(deleteTarget)}
        title="Delete Lookup"
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

export default LookupListPage;
