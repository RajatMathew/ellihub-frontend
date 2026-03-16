import { useState } from 'react';

import {
  ArrowRight,
  Crown,
  DollarSign,
  EllipsisVertical,
  FileText,
  Pencil,
  Package,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Badge } from '@app/components/ui/badge';
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
import { Progress } from '@app/components/ui/progress';
import { SearchableSelect } from '@app/components/ui/searchable-select';
import { Separator } from '@app/components/ui/separator';
import { StatsCard } from '@app/components/ui/stats-card';
import { formatCurrency } from '@app/lib/helpers';
import { useEmployeesQuery } from '@app/hooks/use-employees';

import { InfoRow } from '@modules/project/components/info-row';
import { PageLoadingSkeleton } from '@modules/project/components/page-loading-skeleton';
import { usePrimeContractComputations } from '@modules/project/components/prime-contract/use-prime-contract-computations';
import { ScheduleTrackerCard } from '@modules/project/components/prime-contract/schedule-tracker-card';
import { ProjectToolbarHeader } from '@modules/project/components/project-toolbar-header';
import { DIVISION_LABELS } from '@modules/project/constants/project.constants';
import { useContractAttachmentsQuery } from '@modules/project/hooks/contract-attachment.hooks';
import {
  useDeleteProjectMutation,
  useProjectDetailQuery,
  useProjectContractQuery,
  useProjectScheduleQuery,
  useProjectFolderQuery,
} from '@modules/project/hooks';
import { useAddTeamMemberMutation, usePromoteToLeadPMMutation, useRemoveTeamMemberMutation } from '@modules/project/hooks/project-team.hooks';
import { usePCOListQuery, usePCOPipelineQuery } from '@modules/project/hooks/pco.hooks';
import { usePOsQuery } from '@modules/purchase-orders/hooks/po.hooks';
import { useSCOsQuery } from '@modules/sco/hooks/sco.hooks';

export default function ProjectContractOverview() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  /* ---- Queries ---- */

  const { data: project, isLoading } = useProjectDetailQuery(projectId);
  const { data: contract } = useProjectContractQuery(projectId);
  const { data: pipeline } = usePCOPipelineQuery(projectId);
  const { data: pcoList } = usePCOListQuery({
    projectId,
    size: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: scoList } = useSCOsQuery({
    projectId,
    size: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: poList } = usePOsQuery({
    projectId,
    size: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: allPOs } = usePOsQuery({ projectId, size: 1000 });
  const { data: attachments } = useContractAttachmentsQuery(projectId);
  const { data: scheduleData, isLoading: isLoadingSchedule } = useProjectScheduleQuery(projectId);
  const { data: primeContractFolderId } = useProjectFolderQuery(projectId || undefined, 'prime contract');
  const deleteMutation = useDeleteProjectMutation();
  const addTeamMemberMutation = useAddTeamMemberMutation();
  const removeTeamMemberMutation = useRemoveTeamMemberMutation();
  const promotePMMutation = usePromoteToLeadPMMutation();
  const employeesQuery = useEmployeesQuery({ size: 1000 });

  /* ---- Computations ---- */

  const computations = usePrimeContractComputations({
    contract,
    pipeline,
    invoiceSummary: undefined, // payments deferred to accounting module
  });

  const [isAddingMember, setIsAddingMember] = useState(false);

  const handleDeleteProject = async () => {
    await deleteMutation.mutateAsync(projectId);
    navigate('/app/projects');
  };

  const handleAddMember = async (employeeId: string) => {
    await addTeamMemberMutation.mutateAsync({ projectId, data: { employeeId } });
    setIsAddingMember(false);
  };

  const handleRemoveMember = async (employeeId: string) => {
    await removeTeamMemberMutation.mutateAsync({ projectId, employeeId });
  };

  const handlePromoteToPM = async (employeeId: string) => {
    await promotePMMutation.mutateAsync({ projectId, employeeId, keepOldPM: true });
  };

  const employeeOptions =
    employeesQuery.data?.data
      ?.filter((e) => {
        const existingIds = new Set([
          ...(project?.teamMembers ?? []).map((tm) => tm.employeeId),
          project?.leadPMId,
        ].filter(Boolean));
        return !existingIds.has(e.id);
      })
      .map((e) => ({ value: e.id, label: e.name })) ?? [];

  // Filter out the lead PM from teamMembers to avoid duplicate display
  const leadPMId = project?.leadPMId;
  const teamMembers = (project?.teamMembers ?? []).filter(
    (tm) => tm.employeeId !== leadPMId,
  );

  // Build address string
  const addressParts = [project?.streetAddress, project?.city, project?.state, project?.zipCode].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  const recentPCOs = pcoList?.data ?? [];
  const recentSCOs = scoList?.data ?? [];
  const recentPOs = poList?.data ?? [];
  const docs = attachments ?? [];

  // Total committed from POs (exclude cancelled)
  const activePOs = (allPOs?.data ?? []).filter(
    (po) => po.status?.name !== 'CANCELLED',
  );
  const totalPOCommitted = activePOs.reduce(
    (sum, po) => sum + (parseFloat(po.totalCommitment || po.total) || 0),
    0,
  );

  if (isLoading) return <PageLoadingSkeleton />;

  if (!project) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Project not found.</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-7.5">
      <div className="space-y-6">
        {/* ---- Toolbar ---- */}
        <ProjectToolbarHeader title={project.name} project={project}>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/app/projects/${projectId}/edit`}>
              <Pencil className="size-4" />
              Edit Project
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" mode="icon" size="sm">
                <EllipsisVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/app/projects/${projectId}/edit`}>
                  <Pencil className="size-4" />
                  Edit Project
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ProjectToolbarHeader>

        <Separator />

        {/* ──────────────────────────────────────────────
            Financial Metrics Banner (4 cards)
           ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<DollarSign className="size-5 text-success" />}
            bgClass="bg-success/10"
            label="Original Contract"
            value={formatCurrency(computations.original)}
            description={contract?.contractType ?? 'Prime Contract'}
          />
          <StatsCard
            icon={<TrendingUp className="size-5 text-info" />}
            bgClass="bg-info/10"
            label="Approved Changes"
            value={`+${formatCurrency(computations.approvedCOs)}`}
            description={`${(pipeline?.approved?.count ?? 0) + (pipeline?.executed?.count ?? 0)} approved COs`}
          />
          <StatsCard
            icon={<DollarSign className="size-5 text-primary" />}
            bgClass="bg-primary/10"
            label="Contract Sum"
            value={formatCurrency(computations.contractSum)}
          />
          <StatsCard
            icon={<Package className="size-5 text-warning" />}
            bgClass="bg-warning/10"
            label="Committed (POs)"
            value={formatCurrency(totalPOCommitted)}
            description={`${activePOs.length} active purchase orders`}
          />
        </div>

        {/* ──────────────────────────────────────────────
            Project Details + Budget Summary
           ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="Project Name">{project.name}</InfoRow>
              <InfoRow label="Job Number">{project.jobNumber ?? '—'}</InfoRow>
              <InfoRow label="Contract Number">{project.contractNumber ?? '—'}</InfoRow>
              <InfoRow label="Division">
                {DIVISION_LABELS[project.division] ?? project.division}
              </InfoRow>
              <InfoRow label="Stage">
                {project.stage ? (
                  <Badge style={{ backgroundColor: project.stage.color, color: '#fff' }} size="sm">
                    {project.stage.name}
                  </Badge>
                ) : (
                  '—'
                )}
              </InfoRow>
              <InfoRow label="Status">
                {project.status ? (
                  <Badge style={{ backgroundColor: project.status.color, color: '#fff' }} size="sm">
                    {project.status.label}
                  </Badge>
                ) : (
                  '—'
                )}
              </InfoRow>
              <Separator className="my-2" />
              <InfoRow label="General Contractor">{project.gc?.name ?? '—'}</InfoRow>
              <InfoRow label="Lead PM">{project.leadPM?.name ?? '—'}</InfoRow>
              {fullAddress && <InfoRow label="Address">{fullAddress}</InfoRow>}
              {project.description && (
                <>
                  <Separator className="my-2" />
                  <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-4">
                    {project.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Budget Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Budget Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Committed Utilization Progress (POs as proxy since payments are deferred) */}
              {(() => {
                const committedUtilization = computations.budgetLimit > 0
                  ? (totalPOCommitted / computations.budgetLimit) * 100
                  : 0;
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Committed vs Budget</span>
                      <span className="text-sm font-semibold">
                        {Math.round(committedUtilization)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(committedUtilization, 100)}
                      className="h-2.5"
                      indicatorClassName={
                        committedUtilization > 90
                          ? 'bg-red-500'
                          : committedUtilization > 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }
                    />
                  </div>
                );
              })()}

              <Separator />

              <div className="space-y-1">
                <InfoRow label="Contract Sum">
                  {formatCurrency(computations.contractSum)}
                </InfoRow>
                <InfoRow label="Target Budget %">
                  {computations.targetBudgetPercent}%
                </InfoRow>
                <InfoRow label="Budget Limit">
                  {formatCurrency(computations.budgetLimit)}
                </InfoRow>
                <Separator className="my-1" />
                <InfoRow label="Committed (POs)" valueClassName="text-warning font-semibold">
                  {formatCurrency(totalPOCommitted)}
                </InfoRow>
                <InfoRow label="Remaining Budget" valueClassName="text-success font-semibold">
                  {formatCurrency(computations.budgetLimit - totalPOCommitted)}
                </InfoRow>
                <InfoRow label="Balance Due" valueClassName="text-destructive font-semibold">
                  {formatCurrency(computations.balanceDue)}
                </InfoRow>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* ──────────────────────────────────────────────
            Recent Activity + Documents
           ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Activity: POs + PCOs + SCOs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Purchase Orders */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Purchase Orders</h4>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link to={`/app/project/${projectId}/purchase-orders`}>
                      View All <ArrowRight className="size-3 ml-1" />
                    </Link>
                  </Button>
                </div>
                {recentPOs.length > 0 ? (
                  <div className="space-y-2">
                    {recentPOs.map((po) => (
                      <Link
                        key={po.id}
                        to={`/app/project/${projectId}/purchase-orders/${po.id}`}
                        className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              {po.poNumber ?? '—'}
                            </span>
                            <Badge
                              style={{ backgroundColor: po.status.color, color: '#fff' }}
                              size="xs"
                            >
                              {po.status.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {po.vendor?.name}
                            </span>
                          </div>
                          <div className="text-sm font-medium truncate">{po.description}</div>
                        </div>
                        <span className="text-sm font-semibold tabular-nums ml-3">
                          {formatCurrency(parseFloat(po.totalCommitment) || 0)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3 text-center">
                    No purchase orders yet.
                  </p>
                )}
              </div>

              <Separator />

              {/* Prime Change Orders */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Prime Change Orders</h4>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link to={`/app/project/${projectId}/change-orders`}>
                      View All <ArrowRight className="size-3 ml-1" />
                    </Link>
                  </Button>
                </div>
                {recentPCOs.length > 0 ? (
                  <div className="space-y-2">
                    {recentPCOs.map((pco) => (
                      <div
                        key={pco.id}
                        className="flex items-center justify-between rounded-lg border p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              {pco.pcoNumber ?? '—'}
                            </span>
                            {pco.status && (
                              <Badge
                                style={{ backgroundColor: pco.status.color, color: '#fff' }}
                                size="xs"
                              >
                                {pco.status.label}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm font-medium truncate">{pco.title}</div>
                        </div>
                        <span className="text-sm font-semibold tabular-nums ml-3">
                          {formatCurrency(pco.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3 text-center">
                    No prime change orders yet.
                  </p>
                )}
              </div>

              <Separator />

              {/* Sub Change Orders */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Sub Change Orders</h4>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" asChild>
                    <Link to={`/app/project/${projectId}/vendors/change-orders`}>
                      View All <ArrowRight className="size-3 ml-1" />
                    </Link>
                  </Button>
                </div>
                {recentSCOs.length > 0 ? (
                  <div className="space-y-2">
                    {recentSCOs.map((sco) => (
                      <div
                        key={sco.id}
                        className="flex items-center justify-between rounded-lg border p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">
                              {sco.scoNumber}
                            </span>
                            <Badge
                              style={{ backgroundColor: sco.status.color, color: '#fff' }}
                              size="xs"
                            >
                              {sco.status.label}
                            </Badge>
                          </div>
                          <div className="text-sm font-medium truncate">{sco.title}</div>
                        </div>
                        <span className="text-sm font-semibold tabular-nums ml-3">
                          {formatCurrency(sco.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-3 text-center">
                    No sub change orders yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents Summary (read-only) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Contract Documents
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs" asChild>
                <Link to={`/app/project/${projectId}/contracts`}>
                  Manage <ArrowRight className="size-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {docs.length > 0 ? (
                <div className="space-y-2">
                  {docs.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 rounded-lg border p-2.5"
                    >
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {att.document?.name ?? 'Document'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FileText className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No documents attached.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/app/project/${projectId}/contracts`}>
                      Add Documents
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ──────────────────────────────────────────────
            Team
           ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Project Team ({teamMembers.length + (project.leadPM ? 1 : 0)})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingMember(true)}
              disabled={isAddingMember}
            >
              <UserPlus className="size-4" />
              Add Member
            </Button>
          </CardHeader>
          <CardContent>
            {/* Add member picker */}
            {isAddingMember && (
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <div className="flex-1">
                  <SearchableSelect
                    options={employeeOptions}
                    value={null}
                    onValueChange={(v) => { if (v) handleAddMember(v); }}
                    placeholder="Select employee..."
                    searchPlaceholder="Search employees..."
                    emptyMessage="No employees found."
                  />
                </div>
                <Button
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  onClick={() => setIsAddingMember(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}

            {project.leadPM || teamMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {project.leadPM && (
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{project.leadPM.name}</div>
                      {project.leadPM.email && (
                        <div className="text-xs text-muted-foreground truncate">
                          {project.leadPM.email}
                        </div>
                      )}
                    </div>
                    <Badge variant="primary" appearance="light" size="sm">
                      Lead PM
                    </Badge>
                  </div>
                )}
                {teamMembers.map((tm) => (
                  <div
                    key={tm.employeeId}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {tm.employee?.name ?? 'Unknown'}
                      </div>
                      {tm.employee?.email && (
                        <div className="text-xs text-muted-foreground truncate">
                          {tm.employee.email}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {tm.role && (
                        <span className="text-xs text-muted-foreground">{tm.role}</span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" mode="icon" size="sm">
                            <EllipsisVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handlePromoteToPM(tm.employeeId)}
                            disabled={promotePMMutation.isPending}
                          >
                            <Crown className="size-4" />
                            Make Lead PM
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleRemoveMember(tm.employeeId)}
                            disabled={removeTeamMemberMutation.isPending}
                          >
                            <X className="size-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Users className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No team members assigned.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ──────────────────────────────────────────────
            Schedule Tracker (full editable table)
           ────────────────────────────────────────────── */}
        <ScheduleTrackerCard
          projectId={projectId}
          contract={contract}
          entries={scheduleData?.data ?? []}
          isLoading={isLoadingSchedule}
          parentFolderId={primeContractFolderId}
        />
      </div>

      {/* ---- Delete confirmation ---- */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteProject}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
