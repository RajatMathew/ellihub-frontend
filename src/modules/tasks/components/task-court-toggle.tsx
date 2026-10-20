import { cn } from '@/app/lib/utils';
import { TASK_COURT_TONES } from '@/modules/tasks/constants/tasks.constants';
import type { TaskCourt } from '@/modules/tasks/schemas/task.schema';
import { ArrowLeftRight } from 'lucide-react';

/**
 * Whose move it is, and the control that hands it over.
 *
 * Drawn as the TaskCard design draws it (elli-ui#1479): a dot in a soft halo
 * of its own colour and the court's name. Pointing at it fills the button with
 * that same soft colour and slides a swap arrow in after the word — the hint
 * that a click hands the ball over.
 *
 * No shadcn primitive fits: `Toggle` is a two-state button but draws a filled
 * pill, and `Badge` is not interactive. Raw rather than `Button` because every
 * size the primitive has would be overridden.
 */
export function TaskCourtToggle({
  court,
  disabled = false,
  onChange,
}: {
  court: TaskCourt;
  disabled?: boolean;
  /** Omit to render as a plain label rather than a control. */
  onChange?: (next: TaskCourt) => void;
}) {
  const tone = TASK_COURT_TONES[court];

  const dot = (
    <span
      className={cn('size-1.5 shrink-0 rounded-full ring-[2.5px]', tone.dot, tone.halo)}
      aria-hidden="true"
    />
  );

  const className = cn(
    'inline-flex h-5.5 items-center gap-1.5 whitespace-nowrap rounded-md pr-2 pl-1 -ml-1 text-[11px] leading-none font-medium',
    tone.text
  );

  if (!onChange) {
    return (
      <span className={className}>
        {dot}
        {tone.label}
      </span>
    );
  }

  const next: TaskCourt = court === 'OURS' ? 'THEIRS' : 'OURS';
  const nextLabel = TASK_COURT_TONES[next].label.toLowerCase();

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(next)}
      // See TaskPriorityMeter: the whole card is a drag handle.
      onPointerDown={(event) => event.stopPropagation()}
      aria-label={`${tone.label}. Move to ${nextLabel}`}
      title={`Move to ${nextLabel}`}
      className={cn(
        className,
        'group/court cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-court-ours disabled:cursor-default',
        tone.soft
      )}
    >
      {dot}
      {tone.label}
      <span
        aria-hidden="true"
        className="inline-flex w-0 overflow-hidden opacity-0 transition-[width,opacity] duration-150 group-hover/court:w-[11px] group-hover/court:opacity-100 group-focus-visible/court:w-[11px] group-focus-visible/court:opacity-100"
      >
        <ArrowLeftRight className="size-[11px] shrink-0" strokeWidth={2} />
      </span>
    </button>
  );
}
