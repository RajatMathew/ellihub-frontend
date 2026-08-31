import { ProjectStatusBadge } from '@/modules/project/components/project-status-badge';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import { DIVISION_LABELS } from '@/modules/project/constants/project.constants';
import { useProjectStagesQuery, useUpdateProjectMutation } from '@/modules/project/hooks';
import {
  formatProjectStageLabel,
  getProjectStageSwatchClassName,
} from '@/modules/project/lib/project-stage-colors';
import type {
  Division,
  ProjectDetail,
  UpdateProjectInput,
} from '@/modules/project/schemas/project.schema';
import { Check, ChevronDown, Share2, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface ProjectToolbarHeaderProps {
  title: string;
  project: ProjectDetail | undefined;
  children?: React.ReactNode;
  onTeamClick?: () => void;
}

/**
 * Resolves a project's status to a vocabulary key and its display text.
 *
 * The status arrives either as a plain string or as a lookup record with its own
 * wording. Colour is not decided here — `ProjectStatusBadge` owns that, so the
 * toolbar and the five other places a project status appears cannot disagree.
 */
const getStatusMeta = (status: ProjectDetail['statusRef'] | ProjectDetail['status']) => {
  if (!status) return undefined;

  if (typeof status === 'string') return { key: status, label: undefined };

  const key = (status.name || status.label || status.id).toUpperCase();

  return { key, label: status.label || status.name || undefined };
};

export function ProjectToolbarHeader({
  title,
  project,
  children,
  onTeamClick,
}: ProjectToolbarHeaderProps) {
  const location = useLocation();
  const { data: stages } = useProjectStagesQuery();
  const updateMutation = useUpdateProjectMutation();
  const canUpdateStage =
    project?.capabilities?.canEdit === true || project?.capabilities?.canManage === true;
  const currentStage = project ? stages?.find((stage) => stage.id === project.stageId) : undefined;
  const currentStageName =
    currentStage?.name || project?.stage?.name || project?.stage?.label || '';
  const currentStageLabel = formatProjectStageLabel(currentStageName);
  const currentStageDotClassName = getProjectStageSwatchClassName(currentStageName);
  const showStage = Boolean(project && currentStageLabel);

  const handleStageChange = (stageId: string) => {
    if (!project || !canUpdateStage || stageId === project.stageId) return;

    // Helper to format ISO date string to YYYY-MM-DD for backend
    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return undefined;
      return dateStr.split('T')[0];
    };
    const optionalString = (value?: string | null) => value ?? undefined;
    const tcoDate = formatDate(project.tcoDate ?? project.estimatedEndDate);

    if (!tcoDate) {
      toast.error('TCO date is required before updating the project stage.');
      return;
    }

    // PUT /project is a full replace, so we must send all required fields
    const fullPayload: UpdateProjectInput = {
      name: project.name,
      description: project.description,
      jobNumber: optionalString(project.jobNumber),
      contractNumber: optionalString(project.contractNumber),
      fieldwireProjectId: project.fieldwireProjectId ?? null,
      fieldwireProjectName: project.fieldwireProjectName ?? null,
      divisionId: optionalString(project.divisionId),
      gcId: optionalString(project.gcId),
      leadPMId: optionalString(project.leadPMId),
      stageId: stageId,
      status: project.status ?? undefined,
      streetAddress: optionalString(project.streetAddress),
      city: optionalString(project.city),
      state: optionalString(project.state),
      zipCode: optionalString(project.zipCode),
      contractValue: project.contractValue,
      contractType: optionalString(project.contractType ?? project.primeContract?.contractType),
      retainagePercent: project.retainagePercent,
      targetBudgetPercent: project.targetBudgetPercent,
      taxRate: project.taxRate,
      paymentTerms: optionalString(project.paymentTerms ?? project.primeContract?.paymentTerms),
      estimatedStartDate: formatDate(project.estimatedStartDate),
      estimatedEndDate: formatDate(project.estimatedEndDate),
      setInactiveDate: formatDate(project.setInactiveDate),
      tcoDate,
    };

    updateMutation.mutate({ id: project.id, data: fullPayload });
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Gather team members for avatar display
  const teamMembers = project?.teamMembers?.filter((ta) => ta.role !== 'Lead PM') || [];
  const allTeamMembers = [
    ...(project?.leadPM ? [{ id: project.leadPM.id, name: project.leadPM.name }] : []),
    ...teamMembers
      .filter((tm) => tm.employee)
      .map((tm) => ({ id: tm.employee!.id, name: tm.employee!.name })),
  ];

  const displayedMembers = allTeamMembers.slice(0, 2);
  const remainingCount = allTeamMembers.length - displayedMembers.length;
  const showProjectMetadata = location.pathname.endsWith('/prime-change-orders');

  return (
    <Toolbar className="bg-page-header">
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <ToolbarPageTitle>{title}</ToolbarPageTitle>
            {(project?.status || project?.statusRef) &&
              (() => {
                const status = getStatusMeta(project?.statusRef ?? project?.status);

                if (!status) return null;

                return <ProjectStatusBadge label={status.label} status={status.key} />;
              })()}
            {showStage ? (
              canUpdateStage && stages && stages.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60"
                      disabled={updateMutation.isPending}
                    >
                      <span
                        className={cn('size-2 shrink-0 rounded-sm', currentStageDotClassName)}
                      />
                      {currentStageLabel}
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {stages.map((stage) => (
                      <DropdownMenuItem key={stage.id} onClick={() => handleStageChange(stage.id)}>
                        <span
                          className={cn(
                            'size-2.5 shrink-0 rounded-sm',
                            getProjectStageSwatchClassName(stage.name)
                          )}
                        />
                        <span className="flex-1 font-normal">
                          {formatProjectStageLabel(stage.name)}
                        </span>
                        {stage.id === project.stageId && (
                          <Check className="size-3.5 text-foreground" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex cursor-default items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground"
                      aria-disabled="true"
                    >
                      <span
                        className={cn('size-2 shrink-0 rounded-sm', currentStageDotClassName)}
                      />
                      {currentStageLabel}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {canUpdateStage
                      ? 'Stage options are loading.'
                      : 'You do not have permission to update the project stage.'}
                  </TooltipContent>
                </Tooltip>
              )
            ) : null}
          </div>
          {showProjectMetadata && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {project?.name && title !== project.name && (
                <span>
                  <span className="font-medium">Project:</span> {project.name}
                </span>
              )}
              {project?.jobNumber && (
                <span>
                  <span className="font-medium">Job #:</span> {project.jobNumber}
                </span>
              )}
              {project?.division && (
                <span>
                  <span className="font-medium">Division:</span>{' '}
                  {typeof project.division === 'string'
                    ? (DIVISION_LABELS[project.division as Division] ?? project.division)
                    : project.division?.label || project.division?.name || 'N/A'}
                </span>
              )}
              {project?.gc && (
                <span>
                  <span className="font-medium">GC:</span> {project.gc.name}
                </span>
              )}
              {project?.leadPM && (
                <span>
                  <span className="font-medium">Lead PM:</span> {project.leadPM.name}
                </span>
              )}
            </div>
          )}
        </ToolbarHeading>
        <ToolbarActions>
          {/* Team Avatar Group Button */}
          {project && onTeamClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTeamClick}
              className="group h-auto gap-1.5 rounded-lg border border-transparent bg-transparent p-1 hover:border-card-border hover:bg-surface-hover"
            >
              {displayedMembers.length > 0 ? (
                <span className="flex items-center pl-2">
                  <Share2 className="mr-3 size-4" />
                  {displayedMembers.map((member) => (
                    <Tooltip key={member.id}>
                      <TooltipTrigger asChild>
                        <span className="-ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-surface-hover text-[10px] font-mono tracking-wider font-bold text-foreground shadow-sm transition-colors group-hover:bg-card">
                          {getInitials(member.name)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{member.name}</TooltipContent>
                    </Tooltip>
                  ))}
                  {remainingCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="-ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-surface-hover text-[10px] font-mono tracking-wider font-bold text-muted-foreground shadow-sm transition-colors group-hover:bg-card">
                          +{remainingCount}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {remainingCount} more team member{remainingCount === 1 ? '' : 's'}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </span>
              ) : (
                <Users className="size-4" />
              )}
              {displayedMembers.length === 0 && <span>Project Team</span>}
            </Button>
          )}
          {children}
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
