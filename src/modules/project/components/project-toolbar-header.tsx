import { importedBadges } from '@/app/components/import-source';
import { DetailTitleRow, PageHeader } from '@/app/components/page-header';
import { Button } from '@/app/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { ProjectStagePicker } from '@/modules/project/components/project-stage-picker';
import { PROJECT_STATUS_TONES } from '@/modules/project/constants/project-form.constants';
import { DIVISION_LABELS } from '@/modules/project/constants/project.constants';
import { useProjectStagesQuery } from '@/modules/project/hooks';
import { useUpdateProjectStage } from '@/modules/project/hooks/use-update-project-stage';
import type { Division, ProjectDetail } from '@/modules/project/schemas/project.schema';
import { Share2, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';

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
  const { updateStage, isPending } = useUpdateProjectStage(project);
  const canUpdateStage =
    project?.capabilities?.canEdit === true || project?.capabilities?.canManage === true;
  const currentStage = project ? stages?.find((stage) => stage.id === project.stageId) : undefined;
  const currentStageName =
    currentStage?.name || project?.stage?.name || project?.stage?.label || '';
  const statusMeta = getStatusMeta(project?.statusRef ?? project?.status);

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
    <PageHeader
      className="bg-page-header"
      title={title}
      status={
        <DetailTitleRow
          status={
            statusMeta
              ? { value: statusMeta.key, label: statusMeta.label, tones: PROJECT_STATUS_TONES }
              : undefined
          }
          // Loaded from a legacy migration workbook; the overview's Source card says which one.
          badges={importedBadges(project?.importSource)}
          titleSlot={
            <ProjectStagePicker
              stages={stages}
              currentStageId={project?.stageId}
              currentStageName={currentStageName}
              canUpdate={canUpdateStage}
              isPending={isPending}
              onChange={updateStage}
            />
          }
        />
      }
      description={
        showProjectMetadata && (
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
        )
      }
      leadingActions={
        <>
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
        </>
      }
    />
  );
}
