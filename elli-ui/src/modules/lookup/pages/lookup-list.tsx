import { useMemo, useState } from 'react';

import { Plus } from 'lucide-react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { LookupFormDialog } from '@/modules/lookup/components/lookup-form-dialog';
import { LookupTableCard } from '@/modules/lookup/components/lookup-table-card';
import {
  useCreateLookupMutation,
  useDeleteLookupMutation,
  useLookupsQuery,
  useUpdateLookupMutation,
} from '@/modules/lookup/hooks';
import type { Lookup, LookupCreate, LookupUpdate } from '@/modules/lookup/schemas/lookup.schema';

export function LookupListPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLookup, setEditingLookup] = useState<Lookup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lookup | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  /* ---- Queries & Mutations ---- */
  const { data: lookups = [], isLoading, isError, refetch } = useLookupsQuery();
  const createMutation = useCreateLookupMutation();
  const updateMutation = useUpdateLookupMutation();
  const deleteMutation = useDeleteLookupMutation();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /* ---- Derived: unique types (sorted) ---- */
  const allTypes = useMemo(() => {
    const types = [...new Set(lookups.map((l) => l.type))];
    return types.sort();
  }, [lookups]);

  /* ---- Filtering: by type first, then by search ---- */
  const filteredLookups = useMemo(() => {
    let result = lookups;
    if (typeFilter) {
      result = result.filter((l) => l.type === typeFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.type.toLowerCase().includes(q) ||
          (l.label ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [lookups, typeFilter, search]);

  /* ---- Handlers ---- */
  const handleSubmit = (data: LookupCreate | LookupUpdate) => {
    if ('id' in data && data.id) {
      updateMutation.mutate(data as LookupUpdate, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingLookup(null);
        },
      });
    } else {
      createMutation.mutate(data as LookupCreate, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingLookup(null);
        },
      });
    }
  };

  const handleEdit = (lookup: Lookup) => {
    setEditingLookup(lookup);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingLookup(null);
    setDialogOpen(true);
  };

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        title="Lookups"
        totalCount={filteredLookups.length}
        hasActiveFilters={!!search || !!typeFilter}
        description={isLoading ? <Skeleton className="h-4 w-28" /> : undefined}
        addLabel="Add Lookup"
        addIcon={<Plus className="size-4" />}
        onAdd={openCreate}
      />

      <LookupTableCard
        lookups={filteredLookups}
        allTypes={allTypes}
        typeFilter={typeFilter}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        search={search}
        onSearchChange={setSearch}
        onTypeChange={setTypeFilter}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
      />

      <LookupFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lookup={editingLookup}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Lookup"
        description={
          <>
            This will permanently delete <strong>{deleteTarget?.label ?? deleteTarget?.type}</strong>
            . Any references to this lookup value may need to be updated.
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

export default LookupListPage;
