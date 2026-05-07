import { useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useActivityPanelItems } from '@/app/hooks/use-activity-log';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import {
  DepartmentDetailDialogs,
  DepartmentDetailLoading,
  DepartmentDetailSidebar,
  DepartmentDetailToolbar,
  DepartmentEmployeesTab,
  DepartmentPlaceholderTab,
} from '@/modules/hr/components/departments/detail';
import {
  useDeleteDepartmentMutation,
  useDepartmentDetailQuery,
  useRemoveEmployeeMutation,
} from '@/modules/hr/hooks/departments.hooks';
import { useNavigate, useParams } from 'react-router-dom';

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const departmentQuery = useDepartmentDetailQuery(id ?? '');
  const activityQuery = useActivityPanelItems('department', id);
  const deleteMutation = useDeleteDepartmentMutation();
  const removeEmployeeMutation = useRemoveEmployeeMutation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);

  useBreadcrumbLabel(
    id ? `/app/hr/departments/${id}` : undefined,
    departmentQuery.data?.name ?? 'Department'
  );

  if (departmentQuery.isLoading) {
    return <DepartmentDetailLoading />;
  }

  if (departmentQuery.isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load department."
          onRetry={() => void departmentQuery.refetch()}
        />
      </div>
    );
  }

  if (!departmentQuery.data) {
    return (
      <div className="container-fluid py-7.5">
        <div className="rounded-lg border border-dashed border-border py-14 text-center">
          <p className="text-sm font-medium text-muted-foreground">Department not found.</p>
        </div>
      </div>
    );
  }

  const department = departmentQuery.data;
  const employees = department.employees ?? [];

  const handleConfirmDelete = () => {
    if (!id) return;

    deleteMutation.mutate(id, {
      onSuccess: () => navigate('../..', { relative: 'path' }),
    });
  };

  return (
    <div className="container-fluid py-7.5">
      <DepartmentDetailToolbar
        department={department}
        employeeCount={employees.length}
        sidebarOpen={sidebarOpen}
        onOpenSidebar={() => setSidebarOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      <div className="flex flex-col gap-6 pt-5 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <Tabs defaultValue="employees">
            <TabsList variant="line">
              <TabsTrigger value="employees">Employees</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="employees">
              <DepartmentEmployeesTab
                employees={employees}
                isRemoving={removeEmployeeMutation.isPending}
                onAssign={() => setAssignOpen(true)}
                onRemove={(employeeId) =>
                  removeEmployeeMutation.mutate({ departmentId: department.id, employeeId })
                }
              />
            </TabsContent>
            <TabsContent value="roles">
              <DepartmentPlaceholderTab label="Role management" />
            </TabsContent>
            <TabsContent value="settings">
              <DepartmentPlaceholderTab label="Department settings" />
            </TabsContent>
          </Tabs>
        </div>

        <DepartmentDetailSidebar
          department={department}
          open={sidebarOpen}
          activityItems={activityQuery.items}
          isActivityLoading={activityQuery.isLoading}
          isActivityError={activityQuery.isError}
          onActivityRetry={() => void activityQuery.refetch()}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      <DepartmentDetailDialogs
        department={department}
        deleteOpen={deleteOpen}
        assignOpen={assignOpen}
        isDeletePending={deleteMutation.isPending}
        onDeleteOpenChange={setDeleteOpen}
        onAssignOpenChange={setAssignOpen}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
