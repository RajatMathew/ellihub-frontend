import { useMemo, useState } from 'react';

import {
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Mail,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  Plus,
  PlusCircle,
  Trash2,
  UserMinus,
  Users,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Separator } from '@app/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@app/components/ui/tabs';

import { DetailSidebar } from '@modules/directory/components';
import { EmployeeAssignDialog } from '../../components/departments/employee-assign-dialog';
import {
  useDeleteDepartmentMutation,
  useDepartmentDetailQuery,
  useRemoveEmployeeMutation,
} from '../../hooks/departments.hooks';
import { useActivityLogQuery } from '@modules/directory/hooks';
import { ActivityFeed, type ActivityItem } from '@core/ui/components/sections/activity-feed';
import { getInitials } from '@app/lib/helpers';

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: department, isLoading } = useDepartmentDetailQuery(id ?? '');
  const deleteMutation = useDeleteDepartmentMutation();
  const removeEmployeeMutation = useRemoveEmployeeMutation();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);

  const { data: activityData, isLoading: isActivityLoading } = useActivityLogQuery({
    entityType: 'department',
    entityId: id,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    size: 50,
  });

  const activityItems = useMemo<ActivityItem[]>(() => {
    if (!activityData?.data) return [];
    return activityData.data.map((log) => {
      const action = log.action.toLowerCase();
      let icon = <Clock className="size-4" />;
      let color = "border-muted-foreground/20 bg-muted/30";

      if (action.includes('create')) {
        icon = <PlusCircle className="size-4 text-primary" />;
        color = "border-primary/20 bg-primary/5";
      } else if (action.includes('update')) {
        icon = <Pencil className="size-4 text-info" />;
        color = "border-info/20 bg-info/5";
      } else if (action.includes('delete') || action.includes('remove')) {
        icon = <Trash2 className="size-4 text-destructive" />;
        color = "border-destructive/20 bg-destructive/5";
      } else if (action.includes('assign') || action.includes('link')) {
        icon = <CheckCircle2 className="size-4 text-success" />;
        color = "border-success/20 bg-success/5";
      }

      return {
        id: log.id,
        user: log.user?.name || 'System',
        action: log.description,
        timestamp: log.createdAt ? new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
        avatar: log.user?.image || undefined,
        icon,
        color,
      };
    });
  }, [activityData]);

  if (isLoading) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground uppercase tracking-widest">Loading department...</div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground uppercase tracking-widest">Department not found.</div>
      </div>
    );
  }

  const employees = department.employees || [];

  return (
    <div className="container-fluid py-7.5">
      {/* ---- Toolbar ---- */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to="../.." relative="path" className="hover:text-foreground transition-colors">
                Departments
              </Link>
              {' > '}
              <span>Overview</span>
            </div>
            <ToolbarPageTitle>{department.name}</ToolbarPageTitle>
            <div className="flex items-center gap-4 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <div className="flex items-center gap-1.5 text-foreground">
                <Users className="size-3.5" />
                <span>{employees.length} Employees</span>
              </div>
              {department.createdAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>Created {new Date(department.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" asChild>
              <Link to="edit">
                <Pencil className="size-4" />
                Edit Department
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" mode="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="edit">
                    <Pencil className="size-4" />
                    Edit Department
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Delete Department
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!sidebarOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelRightOpen className="size-4" />
                View Activity
              </Button>
            )}
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* ---- Main layout ---- */}
      <div className="flex gap-6 pt-5">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Main tabs */}
          <Tabs defaultValue="employees">
            <TabsList variant="line">
              <TabsTrigger value="employees">Employees</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* ---- Employees tab ---- */}
            <TabsContent value="employees">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Department Team
                    </span>
                    <Button 
                      size="xs" 
                      variant="primary" 
                      className="h-7 text-[10px] uppercase tracking-wider"
                      onClick={() => setAssignOpen(true)}
                    >
                      <Plus className="size-3" />
                      Assign Employee
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employees.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {employees.map((item: any) => {
                        const emp = item.employee || {};
                        const role = item.role || {};
                        const displayName = emp.fullName || emp.name || 'Unknown Employee';
                        
                        return (
                          <div
                            key={item.id || item.employeeId}
                            className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                                {getInitials(displayName, 2)}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="xs" mode="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeEmployeeMutation.mutate({ departmentId: department.id, employeeId: emp.id })}>
                                    <UserMinus className="size-3.5 mr-2" />
                                    Remove from Department
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-semibold uppercase tracking-tight text-foreground truncate">
                                {displayName}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium uppercase tracking-widest truncate">
                                {role.label || role.name || 'Standard Role'}
                              </div>
                            </div>
                            {emp.email && (
                              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="size-3" />
                                <span className="truncate">{emp.email}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <div className="size-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                        <UserMinus className="size-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No employees assigned yet.</p>
                      <p className="text-xs text-muted-foreground px-4">Assign employees to this department to track team structure.</p>
                      <Button size="sm" variant="outline" className="mt-4" onClick={() => setAssignOpen(true)}>
                        <Plus className="size-3.5 mr-1" />
                        Assign Employee
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- Roles tab ---- */}
            <TabsContent value="roles">
               <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Role management coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---- Settings tab ---- */}
            <TabsContent value="settings">
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Department settings coming soon</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activityChildren={
            <div className="p-4">
              {isActivityLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground uppercase tracking-widest">
                  Loading activity...
                </div>
              ) : activityItems.length > 0 ? (
                <ActivityFeed items={activityItems} />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <History className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">No activity recorded yet.</p>
                </div>
              )}
            </div>
          }
        >
          <div className="space-y-6 pt-2">
            <div>
              <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3 px-1">
                Department Info
              </div>
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">Description</span>
                    <p className="text-sm text-foreground leading-relaxed">
                      {department.description || 'No description provided for this department.'}
                    </p>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Created On</span>
                    <span className="text-sm font-semibold text-foreground">
                      {department.createdAt ? new Date(department.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Department ID</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {department.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DetailSidebar>
      </div>

      {/* ---- Delete confirmation dialog ---- */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Department"
        description={
          <>
            Are you sure you want to delete <strong>{department.name}</strong>? This action cannot be undone. 
            All employee assignments will be removed.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (id) {
            deleteMutation.mutate(id, {
              onSuccess: () => navigate('../..', { relative: 'path' }),
            });
          }
        }}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />

      <EmployeeAssignDialog 
        open={assignOpen} 
        onOpenChange={setAssignOpen} 
        departmentId={department.id} 
      />
    </div>
  );
}
