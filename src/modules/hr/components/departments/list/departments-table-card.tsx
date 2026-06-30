import type { ReactNode } from 'react';

import { DataGridSection } from '@/app/components/data-grid-section';
import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import type { Department } from '@/modules/hr/schemas/department.schema';
import type { Table } from '@tanstack/react-table';
import { Building2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DepartmentsTableCardProps {
  table: Table<Department>;
  totalCount: number;
  isLoading: boolean;
  isRefreshing?: boolean;
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
  isRefreshing,
  isError,
  searchInput,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onRetry,
}: DepartmentsTableCardProps) {
  return (
    <Card>
      <TableCardHeader
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            All Departments
          </span>
        }
        actions={
          <TableCardHeaderToolbar>
            <TableCardHeaderSearch
              value={searchInput}
              placeholder="Search departments..."
              onChange={onSearchChange}
              className="sm:w-72"
            />
            <TableCardHeaderClearButton active={Boolean(searchQuery)} onClick={onClearSearch} />
          </TableCardHeaderToolbar>
        }
      />

      <DataGridSection
        table={table}
        totalCount={totalCount}
        isLoading={isLoading || Boolean(isRefreshing)}
        refreshIndicator="none"
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
