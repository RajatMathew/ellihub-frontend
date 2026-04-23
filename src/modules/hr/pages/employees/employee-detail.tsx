import { useMemo, useState } from 'react';

import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  History,
  Mail,
  MapPin,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  Phone,
  PlusCircle,
  ShieldAlert,
  Trash2,
  User,
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
import { Skeleton } from '@app/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@app/components/ui/tabs';
import { DetailSidebar } from '@modules/directory/components';

import {
  useDeleteEmployeeMutation,
  useEmployeeDetailQuery,
  useEmployeeProjectsQuery,
} from '../../hooks/employees.hooks';
import { useActivityLogQuery } from '@modules/directory/hooks';
import { ActivityFeed, type ActivityItem } from '@core/ui/components/sections/activity-feed';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: employee, isLoading } = useEmployeeDetailQuery(id ?? '');
  const { data: projects, isLoading: isLoadingProjects } = useEmployeeProjectsQuery(id ?? '');
  const deleteMutation = useDeleteEmployeeMutation();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: activityData, isLoading: isActivityLoading } = useActivityLogQuery({
    entityType: 'employee',
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
      } else if (action.includes('delete') || action.includes('archive') || action.includes('deactivate')) {
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
        <div className="text-sm text-muted-foreground uppercase tracking-widest">
          Loading employee profile...
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground uppercase tracking-widest">
          Employee record not found.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-7.5">
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to="../.." relative="path" className="hover:text-foreground transition-colors">
                Employees
              </Link>
              {' > '}
              <span>Profile Overview</span>
            </div>
            <ToolbarPageTitle>{employee.name}</ToolbarPageTitle>
            <div className="flex items-center gap-4 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <div className="flex items-center gap-1.5 text-foreground">
                <ShieldAlert className="size-3.5" />
                <span>{employee.role?.name || 'Standard Role'}</span>
              </div>
              {employee.startDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>Joined {new Date(employee.startDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" asChild>
              <Link to="edit">
                <Pencil className="size-4" />
                Edit Profile
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
                    Edit Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Deactivate Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!sidebarOpen && (
              <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)}>
                <PanelRightOpen className="size-4" />
                Contact Info
              </Button>
            )}
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <div className="flex gap-6 pt-5">
        <div className="flex-1 min-w-0 space-y-5">
          <Tabs defaultValue="overview">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="history">Activity History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Core Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Start Date
                      </span>
                      <span className="text-sm font-medium">
                        {employee.startDate
                          ? new Date(employee.startDate).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Base Department
                      </span>
                      <span className="text-sm font-medium uppercase tracking-tight">
                        {employee.department?.name || 'Unassigned'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Work Address
                      </span>
                      <span className="text-sm font-medium text-right max-w-[200px] truncate">
                        {employee.address || 'Office (NY)'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Emergency Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Full Name
                      </span>
                      <span className="text-sm font-medium">
                        {employee.emergencyContactName || '—'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Relationship
                      </span>
                      <span className="text-sm font-medium uppercase tracking-widest">
                        {employee.emergencyContactRelation || '—'}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        Phone Number
                      </span>
                      <span className="text-sm font-medium">
                        {employee.emergencyContactPhone || '—'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="projects">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    Assigned Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingProjects ? (
                    <div className="py-8 space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : projects && projects.length > 0 ? (
                    <div className="divide-y divide-border">
                      {projects.map((proj) => (
                        <div key={proj.id} className="py-3 flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold uppercase tracking-tight group-hover:text-primary transition-colors">
                              {proj.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              {proj.status}
                            </span>
                          </div>
                          <Button variant="ghost" size="xs" mode="icon" asChild>
                            <Link to={`/projects/${proj.id}`}>
                              <PanelRightOpen className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Briefcase className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                        No projects assigned yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardContent className="py-8">
                  {isActivityLoading ? (
                    <div className="py-12 text-center text-sm text-muted-foreground uppercase tracking-widest">
                      Loading activity history...
                    </div>
                  ) : activityItems.length > 0 ? (
                    <ActivityFeed items={activityItems} />
                  ) : (
                    <div className="py-20 text-center">
                      <History className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                        No activity recorded for this employee.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

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
          <div className="p-4 space-y-4">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-2 font-bold">
                Quick Contact
              </span>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="size-4 text-primary" />
                  <span className="truncate">{employee.email}</span>
                </div>
                {employee.phoneNumber && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="size-4 text-success" />
                    <span>{employee.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="size-4 text-destructive" />
                  <span className="truncate">{employee.address || 'New York, USA'}</span>
                </div>
              </div>
            </div>
            <Separator />
            <div className="text-center pt-4">
              <div className="size-20 rounded-full bg-primary/5 mx-auto flex items-center justify-center mb-3">
                <User className="size-10 text-primary/30" />
              </div>
              <p className="text-xs text-muted-foreground italic leading-relaxed">
                Employee profile managed by HR system. Account active since{' '}
                {employee.createdAt
                  ? new Date(employee.createdAt).toLocaleDateString()
                  : 'system init'}
                .
              </p>
            </div>
          </div>
        </DetailSidebar>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Deactivate Employee Account"
        description={
          <>
            Are you sure you want to deactivate <strong>{employee.name}</strong>? They will lose
            access to the system and their role assignments will be archived.
          </>
        }
        confirmLabel="Deactivate"
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
    </div>
  );
}
