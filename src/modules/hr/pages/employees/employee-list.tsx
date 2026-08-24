import { useCallback, useState } from 'react';

import {
  BulkDeleteDialog,
  DataTable,
  f,
  useListState,
  useListTable,
  type ListSelectionConfig,
} from '@/app/components/data-table';
import { Button } from '@/app/components/ui/button';
import { useAccess } from '@/app/contexts/access-context';
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
  useBulkDeleteEmployeesMutation,
  useDeleteEmployeeMutation,
  useEmployeesQuery,
  useEmployeeStatsQuery,
} from '@/modules/hr/hooks/employees.hooks';
import type { Employee, ListEmployeesParams } from '@/modules/hr/schemas/employee.schema';
import { Plus, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const EMPLOYEE_FILTERS = [
  f.search({ className: 'min-w-0 sm:w-72', placeholder: 'Search employees...' }),
];

interface EmployeeDeleteTarget {
  id: string;
  name: string;
}

const EMPLOYEE_ITEM_LABEL = { many: 'employees', one: 'employee' };

// Module scope, so the selection config keeps one identity for the table's life.
const EMPLOYEE_SELECTION: ListSelectionConfig<Employee> = {
  getRowLabel: (employee) => employee.name,
};

export default function EmployeeListPage() {
  const { can } = useAccess();
  const canDelete = can('employee', 'delete');
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDeleteTarget | null>(null);
  const [isBulkDeleteOpen, setBulkDeleteOpen] = useState(false);

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

  const columns = useEmployeeListColumns(handleDelete, canDelete);

  const list = useListTable({
    columns,
    getRowId: (employee) => employee.id,
    query: employeesQuery,
    rows: employeesQuery.data?.data ?? [],
    selection: canDelete ? EMPLOYEE_SELECTION : undefined,
    state,
    totalCount: employeesQuery.data?.pagination?.totalItems ?? 0,
  });

  // Only the records the server actually deleted leave the selection. Anything
  // it refused stays checked so the dialog can name it, which is also why the
  // dialog closes only on a clean run.
  const bulkDelete = useBulkDeleteEmployeesMutation(({ deletedIds, failures }) => {
    list.selection.deselect(deletedIds);
    if (failures.length === 0) setBulkDeleteOpen(false);
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
        bulkItemLabel={EMPLOYEE_ITEM_LABEL}
        bulkActions={
          <Button size="toolbar" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
        }
        className="min-w-0 max-w-full overflow-hidden"
        empty={{
          action: <NewEmployeeButton />,
          description: 'Add your first employee to start managing the workforce.',
          icon: Users,
          title: 'No employees found',
        }}
        error={{ title: 'Failed to load employees.' }}
        list={list}
        mobileBreakpoint="xl"
        mobileItem={(employee, selectionCheckbox) => (
          <EmployeeMobileCard
            canDelete={canDelete}
            employee={employee}
            selectionCheckbox={selectionCheckbox}
            onDelete={handleDelete}
          />
        )}
        state={state}
        tableLayout={{ width: 'fixed' }}
        title="All Employees"
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

      <BulkDeleteDialog
        description="They are removed from all departments and projects."
        failures={bulkDelete.failures}
        isPending={bulkDelete.isPending}
        itemLabel={EMPLOYEE_ITEM_LABEL}
        items={list.selection.items}
        open={isBulkDeleteOpen}
        onConfirm={() => bulkDelete.run(list.selection.ids)}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) bulkDelete.reset();
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
