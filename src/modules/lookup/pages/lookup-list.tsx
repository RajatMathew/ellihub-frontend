import { useMemo, useState } from 'react';

import {
  BulkDeleteDialog,
  DataTable,
  f,
  useListState,
  useListTable,
  type ListSelectionConfig,
} from '@/app/components/data-table';
import { ListPageHeader } from '@/app/components/page-header';
import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { useAccess } from '@/app/contexts/access-context';
import { LookupFormDialog } from '@/modules/lookup/components/lookup-form-dialog';
import { useLookupListColumns } from '@/modules/lookup/components/lookup-list-columns';
import {
  useBulkDeleteLookupsMutation,
  useCreateLookupMutation,
  useDeleteLookupMutation,
  useLookupsQuery,
  useUpdateLookupMutation,
} from '@/modules/lookup/hooks';
import type { Lookup, LookupCreate, LookupUpdate } from '@/modules/lookup/schemas/lookup.schema';
import { ListFilterPlus, Plus, Tag, Trash2 } from 'lucide-react';

const LOOKUP_SORT_BY_OPTIONS = ['type', 'label'] as const;

const LOOKUP_ITEM_LABEL = { many: 'entries', one: 'entry' };

// Module scope, so the selection config keeps one identity for the table's life.
const LOOKUP_SELECTION: ListSelectionConfig<Lookup> = {
  getRowLabel: (lookup) => lookup.label ?? lookup.type,
};

function matchesLookupSearch(lookup: Lookup, query: string) {
  const needle = query.toLowerCase();

  return (
    lookup.type.toLowerCase().includes(needle) ||
    (lookup.label ?? '').toLowerCase().includes(needle)
  );
}

export function LookupListPage() {
  const { can } = useAccess();
  const canDelete = can('lookup', 'delete');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isBulkDeleteOpen, setBulkDeleteOpen] = useState(false);
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
    canDelete,
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
    selection: canDelete ? LOOKUP_SELECTION : undefined,
    state,
  });

  // Only the records the server actually deleted leave the selection. Anything
  // it refused stays checked so the dialog can name it, which is also why the
  // dialog closes only on a clean run.
  const bulkDelete = useBulkDeleteLookupsMutation(({ deletedIds, failures }) => {
    list.selection.deselect(deletedIds);
    if (failures.length === 0) setBulkDeleteOpen(false);
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
      <ListPageHeader
        title="Lookups"
        isLoading={list.isInitialLoading}
        summary={{ total: list.totalCount, filtered: state.hasActiveFilters, label: 'Lookups' }}
        actions={[
          {
            label: 'Add Lookup',
            icon: Plus,
            placement: 'primary',
            onClick: () => {
              setEditingLookup(null);
              setDialogOpen(true);
            },
          },
        ]}
      />

      <DataTable
        ariaLabel="Lookups"
        bulkItemLabel={LOOKUP_ITEM_LABEL}
        bulkActions={
          <Button size="toolbar" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
        }
        empty={{
          icon: Tag,
          title: 'No lookups found',
        }}
        error={{
          description: 'There was an error fetching the data. Please try again.',
          title: 'Failed to load lookups',
        }}
        list={list}
        state={state}
        title={
          typeFilter ? `${typeFilter} (${list.totalCount})` : `All Lookups (${list.totalCount})`
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

      <BulkDeleteDialog
        description="Any references to these lookup values may need to be updated."
        failures={bulkDelete.failures}
        isPending={bulkDelete.isPending}
        itemLabel={LOOKUP_ITEM_LABEL}
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

export default LookupListPage;
