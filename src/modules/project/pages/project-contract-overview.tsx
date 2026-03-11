import { useState } from 'react';

import {
  Building2,
  Calendar,
  DollarSign,
  EllipsisVertical,
  FileText,
  MapPin,
  Pencil,
  Users,
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
import { Separator } from '@app/components/ui/separator';
import { StatsCard } from '@app/components/ui/stats-card';
import { formatCurrency, formatDate } from '@app/lib/helpers';

import { InfoRow } from '@modules/project/components/info-row';
import { PageLoadingSkeleton } from '@modules/project/components/page-loading-skeleton';
import { ProjectToolbarHeader } from '@modules/project/components/project-toolbar-header';
import {
  useDeleteProjectMutation,
  useProjectDetailQuery,
  useProjectContractQuery,
} from '@modules/project/hooks';
import { DIVISION_LABELS, PAYMENT_TERMS_LABELS } from '@modules/project/constants/project.constants';

export default function ProjectContractOverview() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: project, isLoading } = useProjectDetailQuery(projectId);
  const { data: contract } = useProjectContractQuery(projectId);
  const deleteMutation = useDeleteProjectMutation();

  const handleDeleteProject = async () => {
    await deleteMutation.mutateAsync(projectId);
    navigate('/app/projects');
  };

  // Filter out the lead PM from teamMembers to avoid duplicate display
  const leadPMId = project?.leadPMId;
  const teamMembers = (project?.teamMembers ?? []).filter(
    (tm) => tm.employeeId !== leadPMId,
  );
  const scheduleEntries = project?.projectScheduleEntries ?? [];

  // Build address string
  const addressParts = [project?.streetAddress, project?.city, project?.state, project?.zipCode].filter(Boolean);
  const fullAddress = addressParts.join(', ');

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

        {/* ---- Stats Cards ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<DollarSign className="size-5 text-success" />}
            bgClass="bg-success/10"
            label="Contract Value"
            value={formatCurrency(contract?.contractValue ?? 0)}
            description={contract?.contractType ?? 'Prime Contract'}
          />
          <StatsCard
            icon={<Users className="size-5 text-primary" />}
            bgClass="bg-primary/10"
            label="Team Members"
            value={teamMembers.length + (project.leadPM ? 1 : 0)}
            description={project.leadPM ? `PM: ${project.leadPM.name}` : 'No lead PM'}
          />
          <StatsCard
            icon={<Calendar className="size-5 text-info" />}
            bgClass="bg-info/10"
            label="Schedule Entries"
            value={scheduleEntries.length}
            description={
              project.effectiveStartDate
                ? `Start: ${formatDate(project.effectiveStartDate)}`
                : 'No dates set'
            }
          />
          <StatsCard
            icon={<Building2 className="size-5 text-warning" />}
            bgClass="bg-warning/10"
            label="Division"
            value={DIVISION_LABELS[project.division] ?? project.division}
            description={project.stage?.name ?? '—'}
          />
        </div>

        {/* ---- Main content grid ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
            </CardContent>
          </Card>

          {/* Contract Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Contract Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {contract ? (
                <>
                  <InfoRow label="Contract Value">
                    {formatCurrency(contract.contractValue)}
                  </InfoRow>
                  {contract.totalContractValue != null && (
                    <InfoRow label="Total Contract Value">
                      {formatCurrency(contract.totalContractValue)}
                    </InfoRow>
                  )}
                  {contract.contractType && (
                    <InfoRow label="Contract Type">{contract.contractType}</InfoRow>
                  )}
                  <InfoRow label="Retainage">
                    {contract.retainagePercent != null ? `${contract.retainagePercent}%` : '—'}
                  </InfoRow>
                  <InfoRow label="Target Budget">
                    {contract.targetBudgetPercent != null
                      ? `${contract.targetBudgetPercent}%`
                      : '—'}
                  </InfoRow>
                  <InfoRow label="Payment Terms">
                    {contract.paymentTerms
                      ? PAYMENT_TERMS_LABELS[contract.paymentTerms]
                      : '—'}
                  </InfoRow>
                  <Separator className="my-2" />
                  <InfoRow label="Est. Start">
                    {contract.estimatedStartDate
                      ? formatDate(contract.estimatedStartDate)
                      : '—'}
                  </InfoRow>
                  <InfoRow label="Est. Completion">
                    {contract.estimatedCompletionDate
                      ? formatDate(contract.estimatedCompletionDate)
                      : '—'}
                  </InfoRow>
                  <InfoRow label="Actual Start">
                    {contract.actualStartDate
                      ? formatDate(contract.actualStartDate)
                      : '—'}
                  </InfoRow>
                  <InfoRow label="Actual Completion">
                    {contract.actualCompletionDate
                      ? formatDate(contract.actualCompletionDate)
                      : '—'}
                  </InfoRow>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <FileText className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No contract set up yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.description ? (
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {project.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
              {fullAddress && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-start gap-3">
                    <MapPin className="size-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs text-muted-foreground">Location</div>
                      <div className="text-sm font-medium">{fullAddress}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---- Team + Schedule row ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Team */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Project Team ({teamMembers.length + (project.leadPM ? 1 : 0)})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.leadPM || teamMembers.length > 0 ? (
                <div className="space-y-3">
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
                      {tm.role && (
                        <span className="text-xs text-muted-foreground">{tm.role}</span>
                      )}
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

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Effective dates summary */}
              {(project.effectiveStartDate || project.effectiveEndDate) && (
                <div className="flex items-center gap-4 mb-4 pb-4 border-b">
                  {project.effectiveStartDate && (
                    <div>
                      <div className="text-xs text-muted-foreground">Effective Start</div>
                      <div className="text-sm font-medium">
                        {formatDate(project.effectiveStartDate)}
                      </div>
                    </div>
                  )}
                  {project.effectiveEndDate && (
                    <div>
                      <div className="text-xs text-muted-foreground">Effective End</div>
                      <div className="text-sm font-medium">
                        {formatDate(project.effectiveEndDate)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {scheduleEntries.length > 0 ? (
                <div className="space-y-3">
                  {scheduleEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <Calendar className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.date)}
                          </span>
                        </div>
                        <div className="text-sm font-medium">{entry.description}</div>
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {entry.notes}
                          </p>
                        )}
                        {(entry.adjustedStartDate || entry.adjustedFinishDate) && (
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {entry.adjustedStartDate && (
                              <span>Start: {formatDate(entry.adjustedStartDate)}</span>
                            )}
                            {entry.adjustedFinishDate && (
                              <span>Finish: {formatDate(entry.adjustedFinishDate)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {scheduleEntries.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{scheduleEntries.length - 5} more entries
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Calendar className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No schedule entries yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
