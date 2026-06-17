import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Badge } from '@/app/components/ui/badge';
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
import { toast } from 'sonner';

interface ProjectToolbarHeaderProps {
  title: string;
  project: ProjectDetail | undefined;
  children?: React.ReactNode;
  onTeamClick?: () => void;
}

const STATUS_META: Record<string, { label: string; badgeClassName: string }> = {
  ACTIVE: {
    label: 'Active',
    badgeClassName: 'bg-success text-success-foreground',
  },
  INACTIVE: {
    label: 'Inactive',
    badgeClassName: 'bg-warning text-warning-foreground',
  },
  CLOSED: {
    label: 'Closed',
    badgeClassName: 'bg-muted text-muted-foreground',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClassName: 'bg-primary text-primary-foreground',
  },
};

const getStatusMeta = (status: ProjectDetail['statusRef'] | ProjectDetail['status']) => {
  if (!status) return undefined;

  if (typeof status === 'string') {
    return (
      STATUS_META[status] ?? { label: status, badgeClassName: STATUS_META.COMPLETED.badgeClassName }
    );
  }

  const statusKey = (status.name || status.label || status.id).toUpperCase();
  const configuredStatus = STATUS_META[statusKey];

  return {
    label: status.label || status.name || configuredStatus?.label || 'N/A',
    badgeClassName: configuredStatus?.badgeClassName ?? STATUS_META.COMPLETED.badgeClassName,
  };
};

export function ProjectToolbarHeader({
  title,
  project,
  children,
  onTeamClick,
}: ProjectToolbarHeaderProps) {
  const { data: stages } = useProjectStagesQuery();
  const updateMutation = useUpdateProjectMutation();
  const canManageProject = project?.capabilities?.canManage ?? false;

  const handleStageChange = (stageId: string) => {
    if (!project || stageId === project.stageId) return;

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

  return (
    <Toolbar className="bg-white dark:bg-background">
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <ToolbarPageTitle>{title}</ToolbarPageTitle>
            {(project?.status || project?.statusRef) &&
              (() => {
                const status = getStatusMeta(project?.statusRef ?? project?.status);

                if (!status) return null;

                return (
                  <Badge className={status.badgeClassName} size="sm">
                    {status.label}
                  </Badge>
                );
              })()}
            {project?.stage && stages && stages.length > 0 && canManageProject ? (
              (() => {
                const name = project.stage.name || project.stage.label || '';
                const displayName = formatProjectStageLabel(name);
                const dotClassName = getProjectStageSwatchClassName(name);

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <span className={cn('size-2 rounded-sm shrink-0', dotClassName)} />
                        {displayName}
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {stages.map((stage) => (
                        <DropdownMenuItem
                          key={stage.id}
                          onClick={() => handleStageChange(stage.id)}
                        >
                          <span
                            className={cn(
                              'size-2.5 rounded-sm shrink-0',
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
                );
              })()
            ) : project?.stage ? (
              <Badge variant="secondary" appearance="outline" size="sm">
                {project.stage.name}
              </Badge>
            ) : null}
          </div>
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
        </ToolbarHeading>
        <ToolbarActions>
          {/* Team Avatar Group Button */}
          {project && onTeamClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTeamClick}
              className="group h-auto gap-1.5 rounded-lg border border-transparent bg-transparent p-1 hover:border-border hover:bg-muted/45 dark:hover:bg-white/[0.06]"
            >
              {displayedMembers.length > 0 ? (
                <span className="flex items-center pl-2">
                  <Share2 className="mr-3 size-4" />
                  {displayedMembers.map((member) => (
                    <Tooltip key={member.id}>
                      <TooltipTrigger asChild>
                        <span className="-ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-gray-100 text-[10px] font-mono tracking-wider font-bold text-foreground shadow-sm transition-colors group-hover:bg-background dark:border-background dark:bg-muted/60 dark:group-hover:bg-zinc-900">
                          {getInitials(member.name)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">{member.name}</TooltipContent>
                    </Tooltip>
                  ))}
                  {remainingCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="-ml-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-gray-100 text-[10px] font-mono tracking-wider font-bold text-muted-foreground shadow-sm transition-colors group-hover:bg-background dark:border-background dark:bg-muted/60 dark:group-hover:bg-zinc-900">
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
