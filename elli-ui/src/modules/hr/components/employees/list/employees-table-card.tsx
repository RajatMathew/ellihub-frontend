import type { ReactNode } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { Input, InputWrapper } from '@/app/components/ui/input';
import type { Employee } from '@/modules/hr/schemas/employee.schema';
import type { Table } from '@tanstack/react-table';
import { Plus, RefreshCcw, Search, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeesTableCardProps {
  table: Table<Employee>;
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  searchInput: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onRetry: () => void;
}

export function EmployeesTableCard({
  table,
  totalCount,
  isLoading,
  isError,
  isRefetching,
  searchInput,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onRetry,
}: EmployeesTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Employees</CardTitle>
        <CardToolbar>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <InputWrapper variant="sm" className="w-full sm:w-72">
              <Search className="size-4" />
              <Input
                placeholder="Search employees..."
                value={searchInput}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </InputWrapper>
            {(searchQuery || isRefetching) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearSearch}>
                {isRefetching ? (
                  <RefreshCcw className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
                {isRefetching ? 'Refreshing...' : 'Clear'}
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
        errorTitle="Failed to load employees."
        emptyIcon={<Users className="size-10 text-muted-foreground/40" />}
        emptyTitle="No employees found"
        emptyDescription="Add your first employee to start managing the workforce."
        onRetry={onRetry}
        tableLayout={{
          width: 'fixed',
        }}
        emptyAction={<NewEmployeeButton />}
      />
    </Card>
  );
}

function NewEmployeeButton(): ReactNode {
  return (
    <Button variant="outline" size="sm" className="mt-4" asChild>
      <Link to="create">
        <Plus className="size-4" />
        New Employee
      </Link>
    </Button>
  );
}
