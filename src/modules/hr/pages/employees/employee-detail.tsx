import { useState } from 'react';

import { ActivityPanel } from '@/app/components/activity-panel';
import { QueryErrorState } from '@/app/components/query-error-state';
import { Card, CardContent } from '@/app/components/ui/card';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useActivityPanelItems } from '@/app/hooks/use-activity-log';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import {
  EmployeeDetailDialogs,
  EmployeeDetailLoading,
  EmployeeDetailSidebar,
  EmployeeDetailToolbar,
  EmployeeDocumentsTab,
  EmployeeOverviewTab,
  EmployeeProjectsTab,
  EmployeeUserLinkDialog,
} from '@/modules/hr/components/employees/detail';
import { EMPLOYEE_DETAIL_TABS } from '@/modules/hr/constants/employees/employee-detail.constants';
import {
  useDeleteEmployeeMutation,
  useEmployeeDetailQuery,
  useEmployeeProjectsQuery,
  useLinkEmployeeUserMutation,
  useRemoveEmployeeDocumentMutation,
  useUnlinkEmployeeUserMutation,
} from '@/modules/hr/hooks/employees.hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [linkUserOpen, setLinkUserOpen] = useState(false);
  const [unlinkUserOpen, setUnlinkUserOpen] = useState(false);

  const { data: employee, isLoading, isError, refetch } = useEmployeeDetailQuery(id ?? '');
  const { data: projects, isLoading: isLoadingProjects } = useEmployeeProjectsQuery(id ?? '');
  const deleteMutation = useDeleteEmployeeMutation();
  const linkUserMutation = useLinkEmployeeUserMutation();
  const unlinkUserMutation = useUnlinkEmployeeUserMutation();
  const removeDocumentMutation = useRemoveEmployeeDocumentMutation();
  const activity = useActivityPanelItems('employee', id);

  useBreadcrumbLabel(id ? `/app/hr/employees/${id}` : undefined, employee?.name ?? 'Employee');

  if (isLoading) {
    return <EmployeeDetailLoading />;
  }

  if (isError) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load employee."
          description="The employee profile could not be loaded."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Employee record not found."
          description="This employee may have been deleted or moved."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container-fluid max-w-full overflow-x-hidden py-5 sm:py-7.5">
      <EmployeeDetailToolbar
        employee={employee}
        sidebarOpen={sidebarOpen}
        onDelete={() => setDeleteOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <Tabs defaultValue="overview" className="min-w-0">
            <TabsList variant="line" className="max-w-full overflow-x-auto">
              {EMPLOYEE_DETAIL_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <EmployeeOverviewTab employee={employee} />
            </TabsContent>
            <TabsContent value="projects">
              <EmployeeProjectsTab projects={projects} isLoading={isLoadingProjects} />
            </TabsContent>
            <TabsContent value="documents">
              <EmployeeDocumentsTab
                documents={employee.documents}
                isRemoving={removeDocumentMutation.isPending}
                onAddDocument={() => setAddDocumentOpen(true)}
                onRemoveDocument={(fileId) => {
                  if (!id) return;
                  removeDocumentMutation.mutate({ employeeId: id, fileId });
                }}
              />
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardContent>
                  <ActivityPanel
                    items={activity.items}
                    isLoading={activity.isLoading}
                    isError={activity.isError}
                    onRetry={() => void activity.refetch()}
                    emptyMessage="No activity recorded for this employee."
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <EmployeeDetailSidebar
          employee={employee}
          open={sidebarOpen}
          activityItems={activity.items}
          isActivityLoading={activity.isLoading}
          isActivityError={activity.isError}
          onClose={() => setSidebarOpen(false)}
          onRetryActivity={() => void activity.refetch()}
          onLinkUser={() => setLinkUserOpen(true)}
          onUnlinkUser={() => setUnlinkUserOpen(true)}
        />
      </div>

      <EmployeeDetailDialogs
        employee={employee}
        deleteOpen={deleteOpen}
        addDocumentOpen={addDocumentOpen}
        isDeleting={deleteMutation.isPending}
        onDeleteOpenChange={setDeleteOpen}
        onAddDocumentOpenChange={setAddDocumentOpen}
        onDelete={() => {
          if (!id) return;
          deleteMutation.mutate(id, {
            onSuccess: () => navigate('..', { relative: 'path' }),
          });
        }}
      />

      <EmployeeUserLinkDialog
        employee={employee}
        open={linkUserOpen}
        isSubmitting={linkUserMutation.isPending}
        onOpenChange={setLinkUserOpen}
        onSubmit={(input) => {
          linkUserMutation.mutate(
            { employeeId: employee.id, input },
            {
              onSuccess: () => {
                setLinkUserOpen(false);
                toast.success('User account linked.');
              },
            }
          );
        }}
      />

      <ConfirmDialog
        open={unlinkUserOpen}
        onOpenChange={setUnlinkUserOpen}
        title="Unlink User Account"
        description={
          <>
            Remove the auth user linked to <strong>{employee.name}</strong>? This deletes their
            login access.
          </>
        }
        confirmLabel="Unlink"
        variant="destructive"
        isPending={unlinkUserMutation.isPending}
        onConfirm={() => {
          unlinkUserMutation.mutate(employee.id, {
            onSuccess: () => {
              setUnlinkUserOpen(false);
              toast.success('User account unlinked.');
            },
          });
        }}
      />
    </div>
  );
}
