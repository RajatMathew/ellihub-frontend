import { useMemo, useState } from 'react';

import { Forbidden } from '@/app/components/error/forbidden';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAccess } from '@/app/contexts/access-context';
import { MemberFormDialog } from '@/modules/settings/components/member-form-dialog';
import { MemberResetPasswordDialog } from '@/modules/settings/components/member-reset-password-dialog';
import { MemberSuspendDialog } from '@/modules/settings/components/member-suspend-dialog';
import { MembersTableCard } from '@/modules/settings/components/members-table-card';
import { useMemberListColumns } from '@/modules/settings/components/use-member-list-columns';
import {
  isMembersSortByField,
  MEMBERS_DEFAULT_PAGE_SIZE,
  MEMBERS_DEFAULT_SORT_BY,
  MEMBERS_DEFAULT_SORT_ORDER,
  MEMBER_ROLE_LABELS,
} from '@/modules/settings/constants/members-list.constants';
import {
  useCreateMemberMutation,
  useMembersQuery,
  useRemoveMemberMutation,
  useResetMemberPasswordMutation,
  useSuspendMemberMutation,
  useUnsuspendMemberMutation,
  useUpdateMemberMutation,
  useUpdateMemberRoleMutation,
} from '@/modules/settings/hooks/members.hooks';
import { useMemberListParams } from '@/modules/settings/hooks/use-member-list-params';
import type { MemberRole, MemberUser } from '@/modules/settings/schemas/members.schema';
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';

export default function MembersPage() {
  const { access, isAdmin, isLoading: isAccessLoading } = useAccess();
  const currentUserId = access?.userId;
  const listParams = useMemberListParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberUser | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<MemberUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<MemberUser | null>(null);
  const [unsuspendTarget, setUnsuspendTarget] = useState<MemberUser | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MemberUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<{ member: MemberUser; role: MemberRole } | null>(
    null
  );

  const membersQuery = useMembersQuery(listParams.params, isAdmin);
  const createMutation = useCreateMemberMutation();
  const updateMutation = useUpdateMemberMutation();
  const updateRoleMutation = useUpdateMemberRoleMutation();
  const resetPasswordMutation = useResetMemberPasswordMutation();
  const suspendMutation = useSuspendMemberMutation();
  const unsuspendMutation = useUnsuspendMemberMutation();
  const removeMutation = useRemoveMemberMutation();

  const members = membersQuery.data?.data ?? [];
  const totalCount = membersQuery.data?.pagination.totalItems ?? 0;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const hasActiveFilters = Boolean(
    listParams.searchQuery ||
    listParams.roleFilter ||
    listParams.statusFilter ||
    listParams.emailStatusFilter
  );

  const columns = useMemberListColumns({
    currentUserId,
    onEdit: (member) => {
      setEditingMember(member);
      setDialogOpen(true);
    },
    onRoleChange: (member, role) => setRoleTarget({ member, role }),
    onResetPassword: setResetPasswordTarget,
    onSuspend: setSuspendTarget,
    onUnsuspend: setUnsuspendTarget,
    onRemove: setRemoveTarget,
  });
  const sorting = useMemo<SortingState>(
    () => [{ id: listParams.sortBy, desc: listParams.sortOrder === 'desc' }],
    [listParams.sortBy, listParams.sortOrder]
  );
  const table = useReactTable({
    data: members,
    columns,
    pageCount: Math.max(1, Math.ceil(totalCount / listParams.size)),
    state: {
      pagination: { pageIndex: listParams.page - 1, pageSize: listParams.size },
      sorting,
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    onPaginationChange: (updater) => {
      const previous = { pageIndex: listParams.page - 1, pageSize: listParams.size };
      const next = typeof updater === 'function' ? updater(previous) : updater;
      const patches: Record<string, string | undefined> = {};

      if (next.pageIndex + 1 !== listParams.page) {
        patches.page = next.pageIndex === 0 ? undefined : String(next.pageIndex + 1);
      }

      if (next.pageSize !== listParams.size) {
        patches.size =
          next.pageSize === MEMBERS_DEFAULT_PAGE_SIZE ? undefined : String(next.pageSize);
        patches.page = undefined;
      }

      listParams.updateParams(patches);
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const column = next[0];

      if (!column) {
        listParams.updateParams({ sortBy: undefined, sortOrder: undefined, page: undefined });
        return;
      }

      const nextSortBy = isMembersSortByField(column.id) ? column.id : MEMBERS_DEFAULT_SORT_BY;
      const nextSortOrder = column.desc ? 'desc' : 'asc';

      listParams.updateParams({
        sortBy: nextSortBy === MEMBERS_DEFAULT_SORT_BY ? undefined : nextSortBy,
        sortOrder: nextSortOrder === MEMBERS_DEFAULT_SORT_ORDER ? undefined : nextSortOrder,
        page: undefined,
      });
    },
  });

  if (isAccessLoading) {
    return (
      <div className="container-fluid py-7.5">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-5 h-80 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-fluid py-7.5">
        <Forbidden />
      </div>
    );
  }

  const openCreateDialog = () => {
    setEditingMember(null);
    setDialogOpen(true);
  };

  return (
    <div className="container-fluid py-7.5">
      <ResourcePageHeader
        title="Members & Roles"
        totalCount={totalCount}
        resultLabel="members"
        hasActiveFilters={hasActiveFilters}
        addLabel="Add Member"
        addIcon={<Plus className="size-4" />}
        onAdd={openCreateDialog}
      />

      <MembersTableCard
        table={table}
        totalCount={totalCount}
        searchInput={listParams.searchInput}
        roleFilter={listParams.roleFilter}
        statusFilter={listParams.statusFilter}
        emailStatusFilter={listParams.emailStatusFilter}
        isLoading={membersQuery.isLoading}
        isError={membersQuery.isError}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={listParams.handleSearchChange}
        onRoleFilterChange={(role) => listParams.updateParams({ role, page: undefined })}
        onStatusFilterChange={(status) => listParams.updateParams({ status, page: undefined })}
        onEmailStatusFilterChange={(emailStatus) =>
          listParams.updateParams({ emailStatus, page: undefined })
        }
        onClearFilters={listParams.clearFilters}
        onRetry={() => void membersQuery.refetch()}
      />

      <MemberFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editingMember}
        currentUserId={currentUserId}
        isSubmitting={isSubmitting}
        onCreate={(input) =>
          createMutation.mutate(input, {
            onSuccess: () => {
              setDialogOpen(false);
              setEditingMember(null);
            },
          })
        }
        onUpdate={(input) =>
          updateMutation.mutate(input, {
            onSuccess: () => {
              setDialogOpen(false);
              setEditingMember(null);
            },
          })
        }
      />

      <MemberResetPasswordDialog
        open={!!resetPasswordTarget}
        onOpenChange={(open) => !open && setResetPasswordTarget(null)}
        member={resetPasswordTarget}
        isSubmitting={resetPasswordMutation.isPending}
        onReset={(input) =>
          resetPasswordMutation.mutate(input, {
            onSuccess: () => setResetPasswordTarget(null),
          })
        }
      />

      <MemberSuspendDialog
        open={!!suspendTarget}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        member={suspendTarget}
        isSubmitting={suspendMutation.isPending}
        onSuspend={(input) =>
          suspendMutation.mutate(input, {
            onSuccess: () => setSuspendTarget(null),
          })
        }
      />

      <ConfirmDialog
        open={!!unsuspendTarget}
        onOpenChange={(open) => !open && setUnsuspendTarget(null)}
        title="Unsuspend Member"
        description={
          <>
            Restore access for <strong>{unsuspendTarget?.name}</strong>?
          </>
        }
        confirmLabel="Unsuspend"
        onConfirm={() => {
          if (!unsuspendTarget) return;
          unsuspendMutation.mutate(unsuspendTarget.id, {
            onSuccess: () => setUnsuspendTarget(null),
          });
        }}
        isPending={unsuspendMutation.isPending}
      />

      <ConfirmDialog
        open={!!roleTarget}
        onOpenChange={(open) => !open && setRoleTarget(null)}
        title="Update Role"
        description={
          <>
            Change <strong>{roleTarget?.member.name}</strong> to{' '}
            <strong>{roleTarget?.role ? MEMBER_ROLE_LABELS[roleTarget.role] : 'User'}</strong>?
          </>
        }
        confirmLabel="Update"
        onConfirm={() => {
          if (!roleTarget) return;
          updateRoleMutation.mutate(
            { userId: roleTarget.member.id, role: roleTarget.role },
            { onSuccess: () => setRoleTarget(null) }
          );
        }}
        isPending={updateRoleMutation.isPending}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove Member"
        description={
          <>
            This will permanently remove <strong>{removeTarget?.name}</strong>.
          </>
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (!removeTarget) return;
          removeMutation.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) });
        }}
        variant="destructive"
        isPending={removeMutation.isPending}
      />
    </div>
  );
}
