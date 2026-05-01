import { useCallback, useMemo } from 'react';

import {
  getCoreRowModel,
  getPaginationRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';

import {
  CONTACTS_DEFAULT_PAGE_SIZE,
  isContactsSortByField,
} from '@/modules/directory/constants/contacts/contact-list.constants';
import {
  ContactsPageHeader,
  ContactsTableCard,
  useContactListColumns,
} from '@/modules/directory/components/contacts';
import { useContactListParams } from '@/modules/directory/hooks/contacts/use-contact-list-params';
import {
  useContactsQuery,
  useDeleteContactMutation,
  useProfessionalRolesQuery,
  useVendorsQuery,
} from '@/modules/directory/hooks';
import type { ListContactsParams } from '@/modules/directory/schemas/contact.schema';

export function ContactsListPage() {
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
    [page, roleFilter, searchQuery, size, sortBy, sortOrder],
  );

  const { data, isLoading, isError, refetch } = useContactsQuery(filters);
  const { data: professionalRoles = [], isLoading: isRolesLoading } =
    useProfessionalRolesQuery();
  const { data: vendorsData } = useVendorsQuery({ page: 1, limit: 1000 });
  const deleteMutation = useDeleteContactMutation();

  const listData = data?.data ?? [];
  const totalCount = data?.pagination?.totalItems ?? 0;
  const hasActiveFilters = !!searchQuery || !!roleFilter;

  const vendorNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const vendor of vendorsData?.data ?? []) {
      map.set(vendor.id, vendor.name);
    }
    return map;
  }, [vendorsData]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const columns = useContactListColumns({
    vendorNames,
    onDelete: handleDelete,
  });

  const sorting = useMemo<SortingState>(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder],
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
      <ContactsPageHeader totalCount={totalCount} hasActiveFilters={hasActiveFilters} />

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
    </div>
  );
}
