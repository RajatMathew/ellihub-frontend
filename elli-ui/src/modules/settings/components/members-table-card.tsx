import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Card } from '@/app/components/ui/card';
import {
  MEMBER_EMAIL_STATUS_LABELS,
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_LABELS,
} from '@/modules/settings/constants/members-list.constants';
import type {
  MemberEmailStatus,
  MemberRole,
  MemberStatus,
  MemberUser,
} from '@/modules/settings/schemas/members.schema';
import type { Table } from '@tanstack/react-table';
import { ListFilterPlus, UserRound } from 'lucide-react';

interface MembersTableCardProps {
  table: Table<MemberUser>;
  totalCount: number;
  searchInput: string;
  roleFilter?: MemberRole;
  statusFilter?: MemberStatus;
  emailStatusFilter?: MemberEmailStatus;
  isLoading: boolean;
  isRefreshing?: boolean;
  isError: boolean;
  hasActiveFilters: boolean;
  onSearchChange: (search: string) => void;
  onRoleFilterChange: (role: MemberRole | undefined) => void;
  onStatusFilterChange: (status: MemberStatus | undefined) => void;
  onEmailStatusFilterChange: (status: MemberEmailStatus | undefined) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

export function MembersTableCard({
  table,
  totalCount,
  searchInput,
  roleFilter,
  statusFilter,
  emailStatusFilter,
  isLoading,
  isRefreshing,
  isError,
  hasActiveFilters,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onEmailStatusFilterChange,
  onClearFilters,
  onRetry,
}: MembersTableCardProps) {
  const roleOptions = [
    { label: 'All Roles', value: 'all' },
    ...Object.entries(MEMBER_ROLE_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    ...Object.entries(MEMBER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const emailStatusOptions = [
    { label: 'All Emails', value: 'all' },
    ...Object.entries(MEMBER_EMAIL_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <Card>
      <TableCardHeader
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            All Members
          </span>
        }
        actions={
          <TableCardHeaderToolbar>
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search members..."
              onChange={onSearchChange}
              className="sm:w-72"
            />
            <TableCardHeaderSelect
              value={roleFilter ?? 'all'}
              placeholder="All Roles"
              icon={ListFilterPlus}
              options={roleOptions}
              className="sm:w-36"
              onValueChange={(value) =>
                onRoleFilterChange(value === 'all' ? undefined : (value as MemberRole))
              }
            />
            <TableCardHeaderSelect
              value={statusFilter ?? 'all'}
              placeholder="All Statuses"
              options={statusOptions}
              className="sm:w-40"
              onValueChange={(value) =>
                onStatusFilterChange(value === 'all' ? undefined : (value as MemberStatus))
              }
            />
            <TableCardHeaderSelect
              value={emailStatusFilter ?? 'all'}
              placeholder="All Emails"
              options={emailStatusOptions}
              className="sm:w-40"
              onValueChange={(value) =>
                onEmailStatusFilterChange(
                  value === 'all' ? undefined : (value as MemberEmailStatus)
                )
              }
            />
            <TableCardHeaderClearButton active={hasActiveFilters} onClick={onClearFilters} />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading || Boolean(isRefreshing)}
        refreshIndicator="none"
        isError={isError}
        errorTitle="Failed to load members"
        emptyIcon={<UserRound className="size-10 text-muted-foreground/50" />}
        emptyTitle="No members found"
        emptyDescription="Create a member or adjust the current filters."
        onRetry={onRetry}
        tableLayout={{
          width: 'auto',
        }}
        tableClassNames={{
          base: 'min-w-full',
        }}
      />
    </Card>
  );
}
