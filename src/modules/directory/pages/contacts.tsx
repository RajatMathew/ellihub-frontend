import { useCallback, useMemo, useState } from 'react';

import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { useAccess } from '@/app/contexts/access-context';
import {
  ContactListStats,
  ContactsPageHeader,
  ContactsTableCard,
  useContactListColumns,
} from '@/modules/directory/components/contacts';
import { getContactLinkedEntities } from '@/modules/directory/components/contacts/contact-list-utils';
import {
  CONTACTS_DEFAULT_PAGE_SIZE,
  isContactsSortByField,
} from '@/modules/directory/constants/contacts/contact-list.constants';
import {
  useContactsQuery,
  useDeleteContactMutation,
  useDirectoryKpisQuery,
  useProfessionalRolesQuery,
} from '@/modules/directory/hooks';
import { useContactListParams } from '@/modules/directory/hooks/contacts/use-contact-list-params';
import type { Contact, ListContactsParams } from '@/modules/directory/schemas/contact.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';

const emptyVendorNames = new Map<string, string>();

export function ContactsListPage() {
  const { can } = useAccess();
  const {
    page,
    size,
    searchQuery,
    sortBy,
    sortOrder,
    roleFilter,
    searchInput,
    updateParams,
    handleSearchChange,
    clearFilters,
  } = useContactListParams();

  const filters = useMemo<ListContactsParams>(
    () => ({
      page,
      size,
      sortBy,
      sortOrder,
      search: searchQuery || undefined,
      professionalRoleId: roleFilter,
    }),
    [page, roleFilter, searchQuery, size, sortBy, sortOrder]
  );

  const { data, isLoading, isError, refetch } = useContactsQuery(filters);
  const { data: stats, isLoading: isStatsLoading } = useDirectoryKpisQuery();
  const { data: professionalRoles = [], isLoading: isRolesLoading } = useProfessionalRolesQuery();
  const deleteMutation = useDeleteContactMutation();
  const [pendingDeleteContact, setPendingDeleteContact] = useState<Contact | null>(null);

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;
  const hasActiveFilters = !!searchQuery || !!roleFilter;

  const vendorNames = emptyVendorNames;

  const handleDelete = useCallback(
    (contact: Contact) => {
      const links = getContactLinkedEntities(contact, vendorNames);
      if (links.length > 0) {
        const linkedNames = links
          .map((link) => `${link.type === 'GC' ? 'GC' : 'vendor'} ${link.name}`)
          .join(', ');
        toast.error(
          `Cannot delete this contact because it is linked to ${linkedNames}. Unlink it before deleting.`
        );
        return;
      }

      setPendingDeleteContact(contact);
    },
    [vendorNames]
  );

  const columns = useContactListColumns({
    vendorNames,
    canUpdate: can('contact', 'update'),
    canDelete: can('contact', 'delete'),
    onDelete: handleDelete,
  });

  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );

  const table = useReactTable({
    data: listData,
    columns,
    pageCount: Math.max(1, Math.ceil(totalCount / size)),
    state: {
      pagination: { pageIndex: page - 1, pageSize: size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const previous = { pageIndex: page - 1, pageSize: size };
      const next = typeof updater === 'function' ? updater(previous) : updater;
      const patches: Record<string, string | undefined> = {};

      if (next.pageIndex + 1 !== page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }

      if (next.pageSize !== size) {
        patches.size =
          next.pageSize === CONTACTS_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
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

      const nextSortBy = isContactsSortByField(column.id) ? column.id : 'fullName';
      const nextSortOrder = column.desc ? 'desc' : 'asc';

      updateParams({
        sortBy: nextSortBy === 'fullName' ? undefined : nextSortBy,
        sortOrder: nextSortOrder === 'asc' ? undefined : nextSortOrder,
        page: undefined,
      });
    },
  });

  return (
    <div className="container-fluid py-7.5">
      <ContactsPageHeader
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        canCreate={can('contact', 'create')}
      />
      <ContactListStats stats={stats} isLoading={isStatsLoading} />

      <ContactsTableCard
        table={table}
        professionalRoles={professionalRoles}
        roleFilter={roleFilter}
        searchInput={searchInput}
        isLoading={isLoading}
        isRolesLoading={isRolesLoading}
        isError={isError}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onRoleChange={(roleId) => updateParams({ professionalRoleId: roleId, page: undefined })}
        onClearFilters={clearFilters}
        onRetry={() => void refetch()}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteContact)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteContact(null);
        }}
        title="Delete Contact Permanently"
        description={
          <>
            This action cannot be undone. This will permanently delete{' '}
            <strong>{pendingDeleteContact?.fullName ?? 'this contact'}</strong>.
          </>
        }
        confirmLabel="Delete Permanently"
        onConfirm={() => {
          if (!pendingDeleteContact) return;
          deleteMutation.mutate(pendingDeleteContact.id, {
            onSuccess: () => setPendingDeleteContact(null),
          });
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
