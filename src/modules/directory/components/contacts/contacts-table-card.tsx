import { type Table } from '@tanstack/react-table';
import { Filter, Search, Users, X } from 'lucide-react';

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
import { Skeleton } from '@/app/components/ui/skeleton';
import type { Contact, ProfessionalRole } from '@/modules/directory/schemas/contact.schema';

interface ContactsTableCardProps {
  table: Table<Contact>;
  professionalRoles: ProfessionalRole[];
  roleFilter: string | undefined;
  searchInput: string;
  isLoading: boolean;
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
  isRolesLoading,
  isError,
  totalCount,
  hasActiveFilters,
  onSearchChange,
  onRoleChange,
  onClearFilters,
  onRetry,
}: ContactsTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Directory</CardTitle>
        <CardToolbar className="w-full sm:w-auto">
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
            {isRolesLoading ? (
              <Skeleton className="h-8 w-full sm:w-44" />
            ) : (
              <Select
                value={roleFilter ?? 'all'}
                onValueChange={(value) => onRoleChange(value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="h-8 w-full text-xs sm:w-44">
                  <Filter className="me-1.5 size-3.5" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {professionalRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.label || role.name || role.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <InputWrapper variant="sm" className="w-full sm:w-64">
              <Search className="size-4" />
              <Input
                placeholder="Search contacts..."
                value={searchInput}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputWrapper>

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
