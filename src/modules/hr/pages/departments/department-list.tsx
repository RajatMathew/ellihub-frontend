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
  DepartmentDeleteDialog,
  DepartmentListStats,
  DepartmentListToolbar,
  useDepartmentListColumns,
} from '@/modules/hr/components/departments/list';
import {
  canDeleteDepartment,
  DEPARTMENT_DELETE_BLOCKED_REASON,
} from '@/modules/hr/components/departments/list/department-list-utils';
import {
  DEPARTMENT_DEFAULT_PAGE_SIZE,
  DEPARTMENT_SORT_FIELDS,
} from '@/modules/hr/constants/departments/department-list.constants';
import {
  useBulkDeleteDepartmentsMutation,
  useDeleteDepartmentMutation,
  useDepartmentsQuery,
  useDepartmentStatsQuery,
} from '@/modules/hr/hooks/departments.hooks';
import type { Department, ListDepartmentsParams } from '@/modules/hr/schemas/department.schema';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const DEPARTMENT_FILTERS = [
  f.search({ className: 'sm:w-72', placeholder: 'Search departments...' }),
];

const DEPARTMENT_ITEM_LABEL = { many: 'departments', one: 'department' };

// Module scope, so the selection config keeps one identity for the table's life.
const DEPARTMENT_SELECTION: ListSelectionConfig<Department> = {
  canSelect: canDeleteDepartment,
  getRowLabel: (department) => department.name,
  ineligibleReason: DEPARTMENT_DELETE_BLOCKED_REASON,
};

interface DepartmentDeleteTarget {
  id: string;
  name: string;
  employeeCount?: number;
}

export default function DepartmentListPage() {
  const { can } = useAccess();
  const canDelete = can('department', 'delete');
  const [deleteTarget, setDeleteTarget] = useState<DepartmentDeleteTarget | null>(null);
  const [isBulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const state = useListState({
    filters: DEPARTMENT_FILTERS,
    pageSize: DEPARTMENT_DEFAULT_PAGE_SIZE,
    sort: { by: 'name', fields: DEPARTMENT_SORT_FIELDS, order: 'asc' },
  });

  const departmentsQuery = useDepartmentsQuery(state.apiParams as ListDepartmentsParams);
  const statsQuery = useDepartmentStatsQuery();
  const deleteMutation = useDeleteDepartmentMutation();

  const columns = useDepartmentListColumns(
    useCallback((department: DepartmentDeleteTarget) => setDeleteTarget(department), []),
    canDelete
  );

  const list = useListTable({
    columns,
    getRowId: (department) => department.id,
    query: departmentsQuery,
    rows: departmentsQuery.data?.data ?? [],
    selection: canDelete ? DEPARTMENT_SELECTION : undefined,
    state,
    totalCount: departmentsQuery.data?.pagination.totalItems ?? 0,
  });

  // Only the records the server actually deleted leave the selection. Anything
  // it refused stays checked so the dialog can name it, which is also why the
  // dialog closes only on a clean run.
  const bulkDelete = useBulkDeleteDepartmentsMutation(({ deletedIds, failures }) => {
    list.selection.deselect(deletedIds);
    if (failures.length === 0) setBulkDeleteOpen(false);
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
        bulkItemLabel={DEPARTMENT_ITEM_LABEL}
        bulkActions={
          <Button size="toolbar" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
        }
        empty={{
          action: <NewDepartmentButton />,
          description: 'Create your first department to start organizing your team.',
          icon: Building2,
          title: 'No departments found',
        }}
        error={{ title: 'Failed to load departments.' }}
        list={list}
        state={state}
        title="All Departments"
      />

      <DepartmentDeleteDialog
        isPending={deleteMutation.isPending}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      <BulkDeleteDialog
        failures={bulkDelete.failures}
        isPending={bulkDelete.isPending}
        itemLabel={DEPARTMENT_ITEM_LABEL}
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
