import { Check, ChevronDown } from 'lucide-react';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { AvatarGroup, AvatarGroupItem } from '@/app/components/ui/avatar-group';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { getContrastColor } from '@/app/lib/helpers';
import { DIVISION_LABELS } from '@/modules/project/constants/project.constants';
import { useProjectStagesQuery, useUpdateProjectMutation } from '@/modules/project/hooks';
import type {
  Division,
  ProjectDetail,
  UpdateProjectInput,
} from '@/modules/project/schemas/project.schema';

interface ProjectToolbarHeaderProps {
  title: string;
  project: ProjectDetail | undefined;
  children?: React.ReactNode;
  onTeamClick?: () => void;
}

export function ProjectToolbarHeader({
  title,
  project,
  children,
  onTeamClick,
}: ProjectToolbarHeaderProps) {
  const { data: stages } = useProjectStagesQuery();
  const updateMutation = useUpdateProjectMutation();

  const handleStageChange = (stageId: string) => {
    if (!project || stageId === project.stageId) return;
    
    // Helper to format ISO date string to YYYY-MM-DD for backend
    const formatDate = (dateStr?: string | null) => {
      if (!dateStr) return undefined;
      return dateStr.split('T')[0];
    };
    const optionalString = (value?: string | null) => value ?? undefined;

    // PUT /project is a full replace, so we must send all required fields
    const fullPayload: UpdateProjectInput = {
      name: project.name,
      description: project.description,
      jobNumber: optionalString(project.jobNumber),
      contractNumber: optionalString(project.contractNumber),
      fieldwireProjectId: project.fieldwireProjectId ?? null,
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
      contractType: optionalString(project.primeContract?.contractType),
      retainagePercent: project.retainagePercent,
      targetBudgetPercent: project.targetBudgetPercent,
      taxRate: project.taxRate,
      paymentTerms: optionalString(project.primeContract?.paymentTerms),
      estimatedStartDate: formatDate(project.estimatedStartDate),
      estimatedEndDate: formatDate(project.estimatedEndDate),
      setInactiveDate: formatDate(project.setInactiveDate),
      tcoDate: formatDate(project.tcoDate),
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

  // Show max 4 avatars + count
  const displayedMembers = allTeamMembers.slice(0, 4);
  const remainingCount = allTeamMembers.length - displayedMembers.length;

  return (
    <Toolbar className="bg-white dark:bg-background">
      <ToolbarWrapper>
        <ToolbarHeading>
          <div className="flex items-center gap-3">
            <ToolbarPageTitle>{title}</ToolbarPageTitle>
            {(project?.status || project?.statusRef) && (
              (() => {
                const status = project?.statusRef ?? project?.status;
                const STATUS_COLORS: Record<string, string> = {
                  ACTIVE: '#22c55e', // success
                  INACTIVE: '#f59e0b', // warning
                  CLOSED: '#71717a', // muted
                  COMPLETED: '#3b82f6', // primary
                };
                const STATUS_LABELS: Record<string, string> = {
                  ACTIVE: 'Active',
                  INACTIVE: 'Inactive',
                  CLOSED: 'Closed',
                  COMPLETED: 'Completed',
                };
                
                const color =
                  typeof status === 'string'
                    ? (STATUS_COLORS[status] || '#3b82f6')
                    : status?.color || '#3b82f6';
                  
                const label =
                  typeof status === 'string'
                    ? (STATUS_LABELS[status] || status)
                    : status?.label || status?.name || 'N/A';

                return (
                  <Badge
                    style={{
                      backgroundColor: color,
                      color: getContrastColor(color),
                    }}
                    size="sm"
                  >
                    {label}
                  </Badge>
                );
              })()
            )}
            {project?.stage && stages && stages.length > 0 ? (
              (() => {
                const STAGE_COLORS: Record<string, string> = {
                  SUBMITTALS: '#6366f1',
                  BUYOUT: '#8b5cf6',
                  FABRICATION: '#ec4899',
                  INSTALLATION: '#3b82f6',
                  PUNCHLIST: '#f59e0b',
                  CLOSEOUT: '#10b981',
                };
                const name = project.stage.name || project.stage.label || '';
                const nameUpper = name.toUpperCase();
                let color =
                  typeof project.stage.color === 'string' ? project.stage.color : '#94a3b8';

                if (!color) {
                  for (const [key, c] of Object.entries(STAGE_COLORS)) {
                    if (nameUpper.includes(key)) {
                      color = c;
                      break;
                    }
                  }
                }
                
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                        <span
                          className="size-2 rounded-sm shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        {name}
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {stages.map((stage) => (
                        <DropdownMenuItem key={stage.id} onClick={() => handleStageChange(stage.id)}>
                        <span
                          className="size-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: typeof stage.color === 'string' ? stage.color : undefined }}
                        />
                          <span className="flex-1">{stage.name}</span>
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
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                  : (project.division?.label || project.division?.name || 'N/A')}
              </span>
            )}
            {project?.gc && (
              <span>
                <span className="font-medium">GC:</span> {project.gc.name}
              </span>
            )}
            {project?.leadPM && (
              <span>
                <span className="font-medium">PM:</span> {project.leadPM.name}
              </span>
            )}
          </div>
        </ToolbarHeading>
        <ToolbarActions>
          {/* Team Avatar Group Button */}
          {project && onTeamClick && allTeamMembers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTeamClick}
              className="gap-2 hover:bg-muted/50"
            >
              <AvatarGroup className="-space-x-2">
                {displayedMembers.map((member) => (
                  <AvatarGroupItem key={member.id}>
                    <Avatar className="size-7 border-2 border-background">
                      <AvatarImage src="" alt={member.name} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                  </AvatarGroupItem>
                ))}
              </AvatarGroup>
              {remainingCount > 0 && (
                <span className="text-xs text-muted-foreground">+{remainingCount}</span>
              )}
            </Button>
          )}
          {children}
        </ToolbarActions>
      </ToolbarWrapper>
    </Toolbar>
  );
}
