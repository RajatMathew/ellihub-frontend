import { useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { Forbidden } from '@/app/components/error/forbidden';
import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAccess } from '@/app/contexts/access-context';
import { MemberFormDialog } from '@/modules/settings/components/member-form-dialog';
import { MemberResetPasswordDialog } from '@/modules/settings/components/member-reset-password-dialog';
import { MemberSuspendDialog } from '@/modules/settings/components/member-suspend-dialog';
import { useMemberListColumns } from '@/modules/settings/components/use-member-list-columns';
import {
  MEMBER_EMAIL_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
  MEMBERS_DEFAULT_PAGE_SIZE,
  MEMBERS_DEFAULT_SORT_BY,
  MEMBERS_DEFAULT_SORT_ORDER,
  MEMBERS_SORT_BY_FIELDS,
} from '@/modules/settings/constants/members-list.constants';
import {
  useCreateMemberMutation,
  useMembersQuery,
  useRemoveMemberMutation,
  useResetMemberPasswordMutation,
  useSuspendMemberMutation,
  useUnsuspendMemberMutation,
  useUpdateCheckingRegisterAccessMutation,
  useUpdateMemberMutation,
  useUpdateMemberRoleMutation,
} from '@/modules/settings/hooks/members.hooks';
import type {
  MemberRole,
  MembersListParams,
  MemberUser,
} from '@/modules/settings/schemas/members.schema';
import { ListFilterPlus, Plus, UserRound } from 'lucide-react';

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ label, value }));

const MEMBER_FILTERS = [
  f.search({ className: 'sm:w-72', placeholder: 'Search members...' }),
  f.select({
    className: 'sm:w-36',
    icon: ListFilterPlus,
    key: 'role',
    options: toOptions(MEMBER_ROLE_LABELS),
    placeholder: 'All Roles',
  }),
  f.select({
    className: 'sm:w-40',
    key: 'status',
    options: toOptions(MEMBER_STATUS_LABELS),
    placeholder: 'All Statuses',
  }),
  f.select({
    className: 'sm:w-40',
    key: 'emailStatus',
    options: toOptions(MEMBER_EMAIL_STATUS_LABELS),
    placeholder: 'All Emails',
  }),
];

export default function MembersPage() {
  const { access, isAdmin, isLoading: isAccessLoading } = useAccess();
  const currentUserId = access?.userId;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberUser | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<MemberUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<MemberUser | null>(null);
  const [unsuspendTarget, setUnsuspendTarget] = useState<MemberUser | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MemberUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<{ member: MemberUser; role: MemberRole } | null>(
    null
  );
  const [checkingRegisterAccessTarget, setCheckingRegisterAccessTarget] = useState<{
    member: MemberUser;
    enabled: boolean;
  } | null>(null);

  const state = useListState({
    filters: MEMBER_FILTERS,
    pageSize: MEMBERS_DEFAULT_PAGE_SIZE,
    sort: {
      by: MEMBERS_DEFAULT_SORT_BY,
      fields: MEMBERS_SORT_BY_FIELDS,
      order: MEMBERS_DEFAULT_SORT_ORDER,
    },
  });

  const membersQuery = useMembersQuery(state.apiParams as MembersListParams, isAdmin);
  const createMutation = useCreateMemberMutation();
  const updateMutation = useUpdateMemberMutation();
  const updateRoleMutation = useUpdateMemberRoleMutation();
  const updateCheckingRegisterAccessMutation = useUpdateCheckingRegisterAccessMutation();
  const resetPasswordMutation = useResetMemberPasswordMutation();
  const suspendMutation = useSuspendMemberMutation();
  const unsuspendMutation = useUnsuspendMemberMutation();
  const removeMutation = useRemoveMemberMutation();

  const columns = useMemberListColumns({
    currentUserId,
    onCheckingRegisterAccessChange: (member, enabled) =>
      setCheckingRegisterAccessTarget({ enabled, member }),
    onEdit: (member) => {
      setEditingMember(member);
      setDialogOpen(true);
    },
    onRemove: setRemoveTarget,
    onResetPassword: setResetPasswordTarget,
    onRoleChange: (member, role) => setRoleTarget({ member, role }),
    onSuspend: setSuspendTarget,
    onUnsuspend: setUnsuspendTarget,
  });

  const list = useListTable({
    columns,
    getRowId: (member) => member.id,
    query: membersQuery,
    rows: membersQuery.data?.data ?? [],
    state,
    totalCount: membersQuery.data?.pagination.totalItems ?? 0,
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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
        addIcon={<Plus className="size-4" />}
        addLabel="Add Member"
        hasActiveFilters={state.hasActiveFilters}
        isLoading={list.isInitialLoading}
        resultLabel="members"
        title="Members & Roles"
        totalCount={list.totalCount}
        onAdd={openCreateDialog}
      />

      <DataTable
        ariaLabel="Members"
        empty={{
          description: 'Create a member or adjust the current filters.',
          icon: <UserRound className="size-10 text-muted-foreground/50" />,
          title: 'No members found',
        }}
        error={{ title: 'Failed to load members' }}
        list={list}
        state={state}
        tableClassNames={{ base: 'min-w-full' }}
        tableLayout={{ width: 'auto' }}
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            All Members
          </span>
        }
      />

      <MemberFormDialog
        currentUserId={currentUserId}
        isSubmitting={isSubmitting}
        member={editingMember}
        open={dialogOpen}
        onCreate={(input) =>
          createMutation.mutate(input, {
            onSuccess: () => {
              setDialogOpen(false);
              setEditingMember(null);
            },
          })
        }
        onOpenChange={setDialogOpen}
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
        isSubmitting={resetPasswordMutation.isPending}
        member={resetPasswordTarget}
        open={Boolean(resetPasswordTarget)}
        onOpenChange={(open) => !open && setResetPasswordTarget(null)}
        onReset={(input) =>
          resetPasswordMutation.mutate(input, { onSuccess: () => setResetPasswordTarget(null) })
        }
      />

      <MemberSuspendDialog
        isSubmitting={suspendMutation.isPending}
        member={suspendTarget}
        open={Boolean(suspendTarget)}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        onSuspend={(input) =>
          suspendMutation.mutate(input, { onSuccess: () => setSuspendTarget(null) })
        }
      />

      <ConfirmDialog
        confirmLabel="Unsuspend"
        description={
          <>
            Restore access for <strong>{unsuspendTarget?.name}</strong>?
          </>
        }
        isPending={unsuspendMutation.isPending}
        open={Boolean(unsuspendTarget)}
        title="Unsuspend Member"
        onConfirm={() => {
          if (!unsuspendTarget) return;

          unsuspendMutation.mutate(unsuspendTarget.id, {
            onSuccess: () => setUnsuspendTarget(null),
          });
        }}
        onOpenChange={(open) => !open && setUnsuspendTarget(null)}
      />

      <ConfirmDialog
        confirmLabel="Update"
        description={
          <>
            Change <strong>{roleTarget?.member.name}</strong> to{' '}
            <strong>{roleTarget?.role ? MEMBER_ROLE_LABELS[roleTarget.role] : 'User'}</strong>?
          </>
        }
        isPending={updateRoleMutation.isPending}
        open={Boolean(roleTarget)}
        title="Update Role"
        onConfirm={() => {
          if (!roleTarget) return;

          updateRoleMutation.mutate(
            { role: roleTarget.role, userId: roleTarget.member.id },
            { onSuccess: () => setRoleTarget(null) }
          );
        }}
        onOpenChange={(open) => !open && setRoleTarget(null)}
      />

      <ConfirmDialog
        confirmLabel={checkingRegisterAccessTarget?.enabled ? 'Grant Access' : 'Remove Access'}
        description={
          checkingRegisterAccessTarget?.enabled ? (
            <>
              Allow <strong>{checkingRegisterAccessTarget.member.name}</strong> to view QuickBooks
              checking accounts and register transactions?
            </>
          ) : (
            <>
              Remove <strong>{checkingRegisterAccessTarget?.member.name}</strong>&apos;s access to
              QuickBooks checking accounts and register transactions?
            </>
          )
        }
        isPending={updateCheckingRegisterAccessMutation.isPending}
        open={Boolean(checkingRegisterAccessTarget)}
        title={
          checkingRegisterAccessTarget?.enabled
            ? 'Grant Checking Register Access'
            : 'Remove Checking Register Access'
        }
        variant={checkingRegisterAccessTarget?.enabled ? 'default' : 'destructive'}
        onConfirm={() => {
          if (!checkingRegisterAccessTarget) return;

          updateCheckingRegisterAccessMutation.mutate(
            {
              enabled: checkingRegisterAccessTarget.enabled,
              userId: checkingRegisterAccessTarget.member.id,
            },
            { onSuccess: () => setCheckingRegisterAccessTarget(null) }
          );
        }}
        onOpenChange={(open) => !open && setCheckingRegisterAccessTarget(null)}
      />

      <ConfirmDialog
        confirmLabel="Remove"
        description={
          <>
            This will permanently remove <strong>{removeTarget?.name}</strong>.
          </>
        }
        isPending={removeMutation.isPending}
        open={Boolean(removeTarget)}
        title="Remove Member"
        variant="destructive"
        onConfirm={() => {
          if (!removeTarget) return;

          removeMutation.mutate(removeTarget.id, { onSuccess: () => setRemoveTarget(null) });
        }}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      />
    </div>
  );
}
