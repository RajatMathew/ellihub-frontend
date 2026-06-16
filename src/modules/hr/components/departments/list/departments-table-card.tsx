import type { ReactNode } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { Input, InputWrapper } from '@/app/components/ui/input';
import type { Department } from '@/modules/hr/schemas/department.schema';
import type { Table } from '@tanstack/react-table';
import { Building2, Plus, RefreshCcw, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DepartmentsTableCardProps {
  table: Table<Department>;
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

export function DepartmentsTableCard({
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
}: DepartmentsTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Departments</CardTitle>
        <CardToolbar>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <InputWrapper variant="sm" className="w-full sm:w-72">
              <Search className="size-4" />
              <Input
                placeholder="Search departments..."
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
        errorTitle="Failed to load departments."
        emptyIcon={<Building2 className="size-10 text-muted-foreground/40" />}
        emptyTitle="No departments found"
        emptyDescription="Create your first department to start organizing your team."
        emptyAction={<NewDepartmentButton />}
        onRetry={onRetry}
        tableLayout={{
          width: 'fixed',
        }}
      />
    </Card>
  );
}

function NewDepartmentButton(): ReactNode {
  return (
    <Button variant="outline" size="sm" className="mt-4" asChild>
      <Link to="create">
        <Plus className="size-4" />
        New Department
      </Link>
    </Button>
  );
}
