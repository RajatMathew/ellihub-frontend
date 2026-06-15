import type { Table } from '@tanstack/react-table';
import { Filter, Search, UserRound, X } from 'lucide-react';

import { DataGridSection } from '@/app/components/data-grid-section';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
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

interface MembersTableCardProps {
  table: Table<MemberUser>;
  totalCount: number;
  searchInput: string;
  roleFilter?: MemberRole;
  statusFilter?: MemberStatus;
  emailStatusFilter?: MemberEmailStatus;
  isLoading: boolean;
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
  isError,
  hasActiveFilters,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onEmailStatusFilterChange,
  onClearFilters,
  onRetry,
}: MembersTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Members</CardTitle>
        <CardToolbar className="w-full sm:w-auto">
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <InputWrapper variant="sm" className="w-full sm:w-72">
              <Search className="size-4" />
              <Input
                placeholder="Search members..."
                value={searchInput}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputWrapper>

            <Select
              value={roleFilter ?? 'all'}
              onValueChange={(value) =>
                onRoleFilterChange(value === 'all' ? undefined : (value as MemberRole))
              }
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-36">
                <Filter className="me-1.5 size-3.5" />
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(MEMBER_ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter ?? 'all'}
              onValueChange={(value) =>
                onStatusFilterChange(value === 'all' ? undefined : (value as MemberStatus))
              }
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(MEMBER_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={emailStatusFilter ?? 'all'}
              onValueChange={(value) =>
                onEmailStatusFilterChange(
                  value === 'all' ? undefined : (value as MemberEmailStatus)
                )
              }
            >
              <SelectTrigger className="h-8 w-full text-xs sm:w-40">
                <SelectValue placeholder="All Emails" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Emails</SelectItem>
                {Object.entries(MEMBER_EMAIL_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearFilters}>
                <X className="size-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardToolbar>
      </CardHeader>

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading}
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
