import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import {
  formatProjectStageLabel,
  getProjectStageSwatchClassName,
} from '@/modules/project/lib/project-stage-colors';
import { Check, ChevronDown } from 'lucide-react';

interface ProjectStage {
  id: string;
  name: string;
}

interface ProjectStagePickerProps {
  stages: ProjectStage[] | undefined;
  currentStageId: string | undefined;
  currentStageName: string;
  canUpdate: boolean;
  isPending: boolean;
  onChange: (stageId: string) => void;
}

const chipClassName =
  'inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground';

/**
 * A project's stage, beside its title.
 *
 * Deliberately not a `StatusBadge`. A project carries both a status and a
 * stage, and they answer different questions — the swatch is the pipeline
 * vocabulary, which is why it keeps its own colours rather than borrowing the
 * status tones.
 */
export function ProjectStagePicker({
  stages,
  currentStageId,
  currentStageName,
  canUpdate,
  isPending,
  onChange,
}: ProjectStagePickerProps) {
  const label = formatProjectStageLabel(currentStageName);
  const swatch = (
    <span
      className={cn('size-2 shrink-0 rounded-sm', getProjectStageSwatchClassName(currentStageName))}
    />
  );

  if (!label) return null;

  if (!canUpdate || !stages?.length) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(chipClassName, 'cursor-default')} aria-disabled="true">
            {swatch}
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {canUpdate
            ? 'Stage options are loading.'
            : 'You do not have permission to update the project stage.'}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change project stage"
          className={cn(
            chipClassName,
            'transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60'
          )}
          disabled={isPending}
        >
          {swatch}
          {label}
          <ChevronDown className="size-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {stages.map((stage) => (
          <DropdownMenuItem key={stage.id} onClick={() => onChange(stage.id)}>
            <span
              className={cn(
                'size-2.5 shrink-0 rounded-sm',
                getProjectStageSwatchClassName(stage.name)
              )}
            />
            <span className="flex-1 font-normal">{formatProjectStageLabel(stage.name)}</span>
            {stage.id === currentStageId && <Check className="size-3.5 text-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
