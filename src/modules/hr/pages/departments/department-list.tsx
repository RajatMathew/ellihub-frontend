import { useCallback, useState } from 'react';

import { DataTable, f, useListState, useListTable } from '@/app/components/data-table';
import { Button } from '@/app/components/ui/button';
import {
  DepartmentDeleteDialog,
  DepartmentListStats,
  DepartmentListToolbar,
  useDepartmentListColumns,
} from '@/modules/hr/components/departments/list';
import {
  DEPARTMENT_DEFAULT_PAGE_SIZE,
  DEPARTMENT_SORT_FIELDS,
} from '@/modules/hr/constants/departments/department-list.constants';
import {
  useDeleteDepartmentMutation,
  useDepartmentsQuery,
  useDepartmentStatsQuery,
} from '@/modules/hr/hooks/departments.hooks';
import type { ListDepartmentsParams } from '@/modules/hr/schemas/department.schema';
import { Building2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPARTMENT_FILTERS = [
  f.search({ className: 'sm:w-72', placeholder: 'Search departments...' }),
];

interface DepartmentDeleteTarget {
  id: string;
  name: string;
  employeeCount?: number;
}

export default function DepartmentListPage() {
  const [deleteTarget, setDeleteTarget] = useState<DepartmentDeleteTarget | null>(null);

  const state = useListState({
    filters: DEPARTMENT_FILTERS,
    pageSize: DEPARTMENT_DEFAULT_PAGE_SIZE,
    sort: { by: 'name', fields: DEPARTMENT_SORT_FIELDS, order: 'asc' },
  });

  const departmentsQuery = useDepartmentsQuery(state.apiParams as ListDepartmentsParams);
  const statsQuery = useDepartmentStatsQuery();
  const deleteMutation = useDeleteDepartmentMutation();

  const columns = useDepartmentListColumns(
    useCallback((department: DepartmentDeleteTarget) => setDeleteTarget(department), [])
  );

  const list = useListTable({
    columns,
    getRowId: (department) => department.id,
    query: departmentsQuery,
    rows: departmentsQuery.data?.data ?? [],
    state,
    totalCount: departmentsQuery.data?.pagination.totalItems ?? 0,
  });

  const hasStatsData = statsQuery.data !== undefined;
  const showStatsInitialLoader = statsQuery.isLoading || (statsQuery.isFetching && !hasStatsData);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    if ((deleteTarget.employeeCount ?? 0) > 0) return;

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteMutation, deleteTarget]);

  return (
    <div className="container-fluid py-7.5">
      <DepartmentListToolbar
        isLoading={list.isInitialLoading}
        searchQuery={state.values.search ?? ''}
        totalCount={list.totalCount}
      />
      <DepartmentListStats isLoading={showStatsInitialLoader} stats={statsQuery.data} />

      <DataTable
        ariaLabel="Departments"
        empty={{
          action: <NewDepartmentButton />,
          description: 'Create your first department to start organizing your team.',
          icon: <Building2 className="size-10 text-muted-foreground/40" />,
          title: 'No departments found',
        }}
        error={{ title: 'Failed to load departments.' }}
        list={list}
        state={state}
        title={
          <span className="flex items-center text-sm font-bold tracking-normal text-table-card-header-foreground">
            All Departments
          </span>
        }
      />

      <DepartmentDeleteDialog
        isPending={deleteMutation.isPending}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function NewDepartmentButton() {
  return (
    <Button asChild className="mt-4" size="sm" variant="outline">
      <Link to="create">
        <Plus className="size-4" />
        New Department
      </Link>
    </Button>
  );
}
