import { useMemo } from 'react';

import type { ColumnDef } from '@tanstack/react-table';
import { MailCheck, MailQuestion } from 'lucide-react';

import { DataGridColumnHeader } from '@/app/components/ui/data-grid-column-header';
import { Badge } from '@/app/components/ui/badge';
import { Skeleton } from '@/app/components/ui/skeleton';
import { MemberActionsMenu } from '@/modules/settings/components/member-actions-menu';
import { MEMBER_ROLE_LABELS } from '@/modules/settings/constants/members-list.constants';
import {
  formatMemberDate,
  getMemberInitials,
  normalizeMemberRole,
} from '@/modules/settings/lib/members.utils';
import type { MemberRole, MemberUser } from '@/modules/settings/schemas/members.schema';

interface UseMemberListColumnsArgs {
  currentUserId?: string;
  onEdit: (member: MemberUser) => void;
  onRoleChange: (member: MemberUser, role: MemberRole) => void;
  onResetPassword: (member: MemberUser) => void;
  onSuspend: (member: MemberUser) => void;
  onUnsuspend: (member: MemberUser) => void;
  onRemove: (member: MemberUser) => void;
}

export function useMemberListColumns({
  currentUserId,
  onEdit,
  onRoleChange,
  onResetPassword,
  onSuspend,
  onUnsuspend,
  onRemove,
}: UseMemberListColumnsArgs) {
  return useMemo<ColumnDef<MemberUser>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Member" />,
        cell: ({ row }) => {
          const member = row.original;
          return (
            <div className="flex min-w-64 items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md border bg-muted text-xs font-semibold uppercase">
                {getMemberInitials(member)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{member.name}</div>
                <div className="truncate text-xs text-muted-foreground">{member.email}</div>
              </div>
            </div>
          );
        },
        meta: {
          headerClassName: 'min-w-72',
          textOverflow: 'truncate',
          tooltipContent: (member) => `${member.name}\n${member.email}`,
          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          ),
        },
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Role" />,
        cell: ({ row }) => {
          const role = normalizeMemberRole(row.original.role);
          return (
            <Badge
              variant={role === 'dev' || role === 'admin' ? 'primary' : 'secondary'}
              appearance="light"
              size="sm"
            >
              {MEMBER_ROLE_LABELS[role]}
            </Badge>
          );
        },
        meta: {
          headerClassName: 'min-w-28',
          skeleton: <Skeleton className="h-5 w-16" />,
        },
      },
      {
        accessorKey: 'emailVerified',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Email" />,
        cell: ({ row }) =>
          row.original.emailVerified ? (
            <Badge variant="success" appearance="light" size="sm">
              <MailCheck className="size-3" />
              Verified
            </Badge>
          ) : (
            <Badge variant="warning" appearance="light" size="sm">
              <MailQuestion className="size-3" />
              Pending
            </Badge>
          ),
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-5 w-20" />,
        },
      },
      {
        accessorKey: 'banned',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Status" />,
        cell: ({ row }) =>
          row.original.banned ? (
            <Badge variant="destructive" appearance="light" size="sm">
              Suspended
            </Badge>
          ) : (
            <Badge variant="success" appearance="light" size="sm">
              Active
            </Badge>
          ),
        meta: {
          headerClassName: 'min-w-32',
          skeleton: <Skeleton className="h-5 w-16" />,
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatMemberDate(row.original.createdAt)}
          </span>
        ),
        meta: {
          headerClassName: 'min-w-36',
          skeleton: <Skeleton className="h-4 w-24" />,
        },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <MemberActionsMenu
              member={row.original}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onRoleChange={onRoleChange}
              onResetPassword={onResetPassword}
              onSuspend={onSuspend}
              onUnsuspend={onUnsuspend}
              onRemove={onRemove}
            />
          </div>
        ),
        meta: {
          headerClassName: 'w-16',
          skeleton: <Skeleton className="ms-auto h-7 w-7" />,
        },
        enableSorting: false,
      },
    ],
    [currentUserId, onEdit, onRemove, onResetPassword, onRoleChange, onSuspend, onUnsuspend]
  );
}
