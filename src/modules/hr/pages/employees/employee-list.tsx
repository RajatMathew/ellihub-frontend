import { useCallback, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { Button } from '@/app/components/ui/button';
import {
  EmployeeDeleteDialog,
  EmployeeListStats,
  EmployeeListToolbar,
  EmployeeMobileCard,
  useEmployeeListColumns,
} from '@/modules/hr/components/employees/list';
import {
  EMPLOYEE_LIST_DEFAULT_PAGE_SIZE,
  EMPLOYEE_SORT_BY_OPTIONS,
} from '@/modules/hr/constants/employees/employee-list.constants';
import {
  useDeleteEmployeeMutation,
  useEmployeesQuery,
  useEmployeeStatsQuery,
} from '@/modules/hr/hooks/employees.hooks';
import type { ListEmployeesParams } from '@/modules/hr/schemas/employee.schema';
import { Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const EMPLOYEE_FILTERS = [
  f.search({ className: 'min-w-0 sm:w-72', placeholder: 'Search employees...' }),
];

interface EmployeeDeleteTarget {
  id: string;
  name: string;
}

export default function EmployeeListPage() {
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDeleteTarget | null>(null);

  const state = useListState({
    filters: EMPLOYEE_FILTERS,
    pageSize: EMPLOYEE_LIST_DEFAULT_PAGE_SIZE,
    sort: { by: 'name', fields: EMPLOYEE_SORT_BY_OPTIONS, order: 'asc' },
  });

  const employeesQuery = useEmployeesQuery(state.apiParams as ListEmployeesParams);
  const statsQuery = useEmployeeStatsQuery();
  const deleteMutation = useDeleteEmployeeMutation();

  const handleDelete = useCallback((employee: EmployeeDeleteTarget) => {
    setDeleteTarget(employee);
  }, []);

  const columns = useEmployeeListColumns(handleDelete);

  const list = useListTable({
    columns,
    getRowId: (employee) => employee.id,
    query: employeesQuery,
    rows: employeesQuery.data?.data ?? [],
    state,
    totalCount: employeesQuery.data?.pagination?.totalItems ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);

  return (
    <div className="container-fluid py-7.5">
      <EmployeeListToolbar
        isLoading={list.isInitialLoading}
        searchQuery={state.values.search ?? ''}
        totalCount={list.totalCount}
      />
      <EmployeeListStats isLoading={showStatsInitialLoader} stats={statsQuery.data} />

      <DataTable
        ariaLabel="Employees"
        className="min-w-0 max-w-full overflow-hidden"
        empty={{
          action: <NewEmployeeButton />,
          description: 'Add your first employee to start managing the workforce.',
          icon: <Users className="size-10 text-muted-foreground/40" />,
          title: 'No employees found',
        }}
        error={{ title: 'Failed to load employees.' }}
        list={list}
        mobileBreakpoint="xl"
        mobileItem={(employee) => (
          <EmployeeMobileCard employee={employee} onDelete={handleDelete} />
        )}
        state={state}
        tableLayout={{ width: 'fixed' }}
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            All Employees
          </span>
        }
      />

      <EmployeeDeleteDialog
        isPending={deleteMutation.isPending}
        target={deleteTarget}
        onConfirm={() => {
          if (!deleteTarget) return;

          deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function NewEmployeeButton() {
  return (
    <Button asChild className="mt-4" size="sm" variant="outline">
      <Link to="create">
        <Plus className="size-4" />
        New Employee
      </Link>
    </Button>
  );
}
