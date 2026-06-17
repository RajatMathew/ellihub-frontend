import { useCallback, useMemo, useState } from 'react';

import { PipelineBoard, type PipelineColumn } from '@/app/components/pipeline-board';
import { Card } from '@/app/components/ui/card';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { ViewSwitcher, useViewMode } from '@/app/components/view-switcher';
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
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type ContactPipelineKey = 'gc' | 'vendor' | 'unaffiliated';

const CONTACT_PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn<ContactPipelineKey>> = [
  { key: 'gc', label: 'GC Contacts', accent: '#1a3a5f' },
  { key: 'vendor', label: 'Vendor Contacts', accent: '#c75e40' },
  { key: 'unaffiliated', label: 'Unaffiliated', accent: '#9a9286' },
];

function classifyContactAffiliation(contact: Contact): ContactPipelineKey {
  if (contact.generalContractor || (contact.gcLinks?.length ?? 0) > 0) return 'gc';
  if (contact.vendor || (contact.vendorLinks?.length ?? 0) > 0) return 'vendor';
  return 'unaffiliated';
}

function ContactPipelineCard({ contact }: { contact: Contact }) {
  const primaryEmail =
    contact.email?.find((e) => e.isPrimary)?.email ?? contact.email?.[0]?.email;
  const primaryPhone =
    contact.phoneNumber?.find((p) => p.isPrimary)?.number ?? contact.phoneNumber?.[0]?.number;
  const contactLine = primaryEmail ?? primaryPhone;
  const companyName = contact.generalContractor?.name ?? contact.vendor?.name;

  return (
    <Link
      to={`/app/directory/contacts/${contact.id}`}
      className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-1 rounded-sm border border-zinc-300/70 bg-card p-3 shadow-none transition-colors hover:border-zinc-400/60 dark:border-zinc-600/80 dark:bg-zinc-950/50">
        <div className="truncate text-sm font-semibold leading-tight text-foreground">
          {contact.fullName}
        </div>
        {contactLine && (
          <div className="truncate text-xs text-foreground/60">{contactLine}</div>
        )}
        {companyName && (
          <div className="mt-1 truncate text-[0.625rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {companyName}
          </div>
        )}
      </div>
    </Link>
  );
}

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
  const [view, setView] = useViewMode<'list' | 'pipeline'>('contacts', 'list');

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

      <div className="mb-3 flex justify-end">
        <ViewSwitcher
          views={[
            { key: 'list', label: 'List' },
            { key: 'pipeline', label: 'Pipeline' },
          ]}
          active={view}
          onChange={setView}
        />
      </div>

      {view === 'list' ? (
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
      ) : (
        <Card>
          <div className="p-4 lg:p-6">
            <PipelineBoard<Contact, ContactPipelineKey>
              items={listData}
              columns={CONTACT_PIPELINE_COLUMNS}
              groupOf={classifyContactAffiliation}
              renderCard={(contact) => <ContactPipelineCard contact={contact} />}
              emptyLabel="No contacts"
            />
          </div>
        </Card>
      )}

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
