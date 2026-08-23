import { useCallback, useMemo, useState } from 'react';

import {
  BulkDeleteDialog,
  DataTable,
  f,
  useListState,
  useListTable,
  type ListSelectionConfig,
} from '@/app/components/data-table';
import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { useAccess } from '@/app/contexts/access-context';
import {
  ContactListStats,
  ContactsPageHeader,
  useContactListColumns,
} from '@/modules/directory/components/contacts';
import { getContactLinkedEntities } from '@/modules/directory/components/contacts/contact-list-utils';
import {
  CONTACTS_DEFAULT_PAGE_SIZE,
  CONTACTS_SORT_BY_OPTIONS,
} from '@/modules/directory/constants/contacts/contact-list.constants';
import {
  useBulkDeleteContactsMutation,
  useContactsQuery,
  useDeleteContactMutation,
  useDirectoryKpisQuery,
  useProfessionalRolesQuery,
} from '@/modules/directory/hooks';
import type { Contact, ListContactsParams } from '@/modules/directory/schemas/contact.schema';
import { ListFilterPlus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const emptyVendorNames = new Map<string, string>();

const CONTACT_ITEM_LABEL = { many: 'contacts', one: 'contact' };

// Module scope, so the selection config keeps one identity for the table's life.
// The eligibility rule is the row menu's rule: a linked contact is refused by the
// API, so it must not be checkable either.
const CONTACT_SELECTION: ListSelectionConfig<Contact> = {
  canSelect: (contact) => getContactLinkedEntities(contact, emptyVendorNames).length === 0,
  getRowLabel: (contact) => contact.fullName,
  ineligibleReason: 'Unlink this contact from its vendor or GC before deleting it.',
};

export function ContactsListPage() {
  const { can } = useAccess();
  const canDelete = can('contact', 'delete');
  const [pendingDeleteContact, setPendingDeleteContact] = useState<Contact | null>(null);
  const [isBulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const { data: professionalRoles = [], isLoading: isRolesLoading } = useProfessionalRolesQuery();

  // Options come from their own query, so the schema is memoized rather than
  // module-level. Without this every render would hand `useListState` a new array.
  const filters = useMemo(
    () => [
      f.select({
        icon: ListFilterPlus,
        isLoading: isRolesLoading,
        key: 'professionalRoleId',
        options: professionalRoles.map((role) => ({
          label: role.label || role.name || role.id,
          value: role.id,
        })),
        placeholder: 'All Roles',
      }),
      f.search({ placeholder: 'Search contacts...' }),
    ],
    [isRolesLoading, professionalRoles]
  );

  const state = useListState({
    filters,
    pageSize: CONTACTS_DEFAULT_PAGE_SIZE,
    sort: { by: 'fullName', fields: CONTACTS_SORT_BY_OPTIONS, order: 'asc' },
  });

  const contactsQuery = useContactsQuery(state.apiParams as ListContactsParams);
  const statsQuery = useDirectoryKpisQuery();
  const deleteMutation = useDeleteContactMutation();

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
    canDelete,
    canUpdate: can('contact', 'update'),
    onDelete: handleDelete,
    vendorNames,
  });

  const list = useListTable({
    columns,
    getRowId: (contact) => contact.id,
    query: contactsQuery,
    rows: contactsQuery.data?.data ?? [],
    selection: canDelete ? CONTACT_SELECTION : undefined,
    state,
    totalCount: contactsQuery.data?.pagination?.totalItems ?? 0,
  });

  // Only the records the server actually deleted leave the selection. Anything
  // it refused stays checked so the dialog can name it, which is also why the
  // dialog closes only on a clean run.
  const bulkDelete = useBulkDeleteContactsMutation(({ deletedIds, failures }) => {
    list.selection.deselect(deletedIds);
    if (failures.length === 0) setBulkDeleteOpen(false);
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);

  return (
    <div className="container-fluid py-7.5">
      <ContactsPageHeader
        canCreate={can('contact', 'create')}
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        totalCount={list.totalCount}
      />
      <ContactListStats isLoading={showStatsInitialLoader} stats={statsQuery.data} />

      <DataTable
        ariaLabel="Contacts"
        bulkItemLabel={CONTACT_ITEM_LABEL}
        bulkActions={
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        }
        empty={{
          description: 'Click "+ Add Contact" to get started.',
          icon: <Users className="size-10 text-muted-foreground/50" />,
          title: 'No contacts yet',
        }}
        error={{ title: 'Failed to load contacts' }}
        list={list}
        state={state}
        tableClassNames={{ base: 'min-w-full' }}
        tableLayout={{ width: 'auto' }}
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            Contact Directory
          </span>
        }
      />

      <ConfirmDialog
        confirmLabel="Delete Permanently"
        description={
          <>
            This action cannot be undone. This will permanently delete{' '}
            <strong>{pendingDeleteContact?.fullName ?? 'this contact'}</strong>.
          </>
        }
        isPending={deleteMutation.isPending}
        open={Boolean(pendingDeleteContact)}
        title="Delete Contact Permanently"
        variant="destructive"
        onConfirm={() => {
          if (!pendingDeleteContact) return;

          deleteMutation.mutate(pendingDeleteContact.id, {
            onSuccess: () => setPendingDeleteContact(null),
          });
        }}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteContact(null);
        }}
      />

      <BulkDeleteDialog
        failures={bulkDelete.failures}
        isPending={bulkDelete.isPending}
        itemLabel={CONTACT_ITEM_LABEL}
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
