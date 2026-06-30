import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Card } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { Contact, ProfessionalRole } from '@/modules/directory/schemas/contact.schema';
import { type Table } from '@tanstack/react-table';
import { ListFilterPlus, Users } from 'lucide-react';

interface ContactsTableCardProps {
  table: Table<Contact>;
  professionalRoles: ProfessionalRole[];
  roleFilter: string | undefined;
  searchInput: string;
  isLoading: boolean;
  isRefreshing?: boolean;
  isRolesLoading: boolean;
  isError: boolean;
  totalCount: number;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onRoleChange: (roleId: string | undefined) => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

export function ContactsTableCard({
  table,
  professionalRoles,
  roleFilter,
  searchInput,
  isLoading,
  isRefreshing,
  isRolesLoading,
  isError,
  totalCount,
  hasActiveFilters,
  onSearchChange,
  onRoleChange,
  onClearFilters,
  onRetry,
}: ContactsTableCardProps) {
  const roleOptions = [
    { label: 'All Roles', value: 'all' },
    ...professionalRoles.map((role) => ({
      label: role.label || role.name || role.id,
      value: role.id,
    })),
  ];

  return (
    <Card>
      <TableCardHeader
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            Contact Directory
          </span>
        }
        actions={
          <TableCardHeaderToolbar>
            {isRolesLoading ? (
              <Skeleton className="h-8 w-full sm:w-44" />
            ) : (
              <TableCardHeaderSelect
                value={roleFilter ?? 'all'}
                placeholder="All Roles"
                icon={ListFilterPlus}
                options={roleOptions}
                onValueChange={(value) => onRoleChange(value === 'all' ? undefined : value)}
              />
            )}
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search contacts..."
              onChange={onSearchChange}
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
        errorTitle="Failed to load contacts"
        emptyIcon={<Users className="size-10 text-muted-foreground/50" />}
        emptyTitle="No contacts yet"
        emptyDescription={'Click "+ Add Contact" to get started.'}
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
