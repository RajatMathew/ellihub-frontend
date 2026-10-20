import { SearchHighlight } from '@/app/components/search-highlight';
import { Checkbox } from '@/app/components/ui/checkbox';
import { cn } from '@/app/lib/utils';
import { TaskAssigneeMenu } from '@/modules/tasks/components/task-assignee-menu';
import { TaskCardEmailSources } from '@/modules/tasks/components/task-card-email-sources';
import { TaskCardFoot } from '@/modules/tasks/components/task-card-foot';
import { TaskCardRecordChips } from '@/modules/tasks/components/task-card-record-chips';
import { TaskCompletionRing } from '@/modules/tasks/components/task-completion-ring';
import { TaskPriorityMeter } from '@/modules/tasks/components/task-priority-meter';
import { useTaskSearchWords } from '@/modules/tasks/hooks/use-task-search-words';
import type { Task, TaskCourt, TaskPriority } from '@/modules/tasks/schemas/task.schema';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function TaskCard({
  task,
  now = new Date(),
  isBusy = false,
  justLanded = false,
  onOpen,
  onComplete,
  onShiftDueDate,
  onReassign,
  onPriorityChange,
  onCourtChange,
}: {
  task: Task;
  now?: Date;
  isBusy?: boolean;
  /** Just changed column, so ring it briefly to show where it went. */
  justLanded?: boolean;
  onOpen: (task: Task) => void;
  onComplete: (task: Task) => void;
  onShiftDueDate: (task: Task, days: number) => void;
  onReassign: (assigneeId: string | null) => void;
  onPriorityChange?: (priority: TaskPriority) => void;
  onCourtChange?: (court: TaskCourt) => void;
}) {
  const isDone = task.status === 'COMPLETED';
  // While the board is searched, the words are marked where they were found,
  // the way the mail list marks its matches (elli-ui#1422).
  const searchWords = useTaskSearchWords();

  // Saves on the click, both ways. The tick used to hold a filled circle for a
  // beat before the card left (#829), from when leaving was a jump; now the
  // card fades out where it sat and slides into Completed (#862), that motion
  // already says "done", and the hold only read as the click waiting.
  const handleComplete = () => onComplete(task);

  return (
    // Drawn to the TaskCard design (elli-ui#1479): a warm paper card with a
    // 16px corner, 20px of padding and 18px between its four bands — the
    // header, the title block, the email stack, and the ruled foot. Completed
    // cards are the same card, only faded and struck through.
    <div
      // What useEqualCardHeights measures, and the minimum it hands back: every
      // card on the board is as tall as the tallest, the foot pinned to the
      // bottom edge so the spare height opens above it.
      data-task-card
      className={cn(
        'group flex min-h-(--task-card-height) flex-col gap-4.5 rounded-2xl border border-task-card-line bg-task-card px-5 pt-5 pb-4 text-xs leading-[1.35] text-foreground shadow-task-card',
        isDone && 'opacity-60',
        // Reduced motion gets the same ring, held plainly for as long as the
        // flag is set, rather than a fade. Deciding here rather than in CSS
        // because Tailwind emits the theme's keyframes after any media block
        // that would try to override them.
        justLanded && (prefersReducedMotion() ? 'ring-2 ring-success' : 'animate-task-landed')
      )}
    >
      {/* The circle, the priority, and — at the far edge — whose task it is. */}
      <div className="flex items-center gap-2.5">
        {/* A real checkbox rather than a button carrying a label: completion is
            a two-state fact about the task, so Radix's role and aria-checked say
            so and space toggles it. Only the shape is ours — the ring beside it
            draws the design's dotted circle, and fills it once done. */}
        <span className="relative -my-1 -mr-0.5 -ml-1 inline-flex shrink-0">
          <Checkbox
            checked={isDone}
            disabled={isBusy}
            onCheckedChange={handleComplete}
            // See TaskPriorityMeter: the whole card is a drag handle.
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
            className="relative z-10 size-5.5 cursor-pointer rounded-full border-0 bg-transparent focus-visible:ring-offset-0 data-[state=checked]:border-0 data-[state=checked]:bg-transparent data-[state=checked]:text-success-foreground [&_svg]:size-2.5"
          />
          <TaskCompletionRing done={isDone} />
        </span>

        <TaskPriorityMeter
          priority={task.priority}
          disabled={isBusy}
          // A completed card shows its priority and owner but does not change
          // them in place; the modal still edits both.
          onChange={onPriorityChange && !isDone ? (next) => onPriorityChange(next) : undefined}
        />

        <span className="flex-1" />

        <TaskAssigneeMenu task={task} disabled={isBusy} readOnly={isDone} onReassign={onReassign} />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        {/* Raw rather than `Button`: the title wraps to three lines at this
            column width, and Button is a fixed-height, nowrap, centred control
            - undoing all of that leaves nothing of the primitive behind. */}
        <button
          type="button"
          // `isBusy` covers the card whose create has not come back: opening it
          // would hand the dialog an id the server has never issued.
          disabled={isBusy}
          onClick={() => onOpen(task)}
          onPointerDown={(event) => event.stopPropagation()}
          title={task.title}
          className="block w-full cursor-pointer text-start font-serif text-base leading-[1.3] font-semibold tracking-[-0.022em] [word-spacing:-0.02em] text-pretty text-foreground hover:underline disabled:cursor-default disabled:no-underline"
        >
          {/* Three lines, then an ellipsis. Cards share the tallest card's
              height, so an unbounded title would set the whole board's. The
              dialog has the full text; so does the tooltip. */}
          <span className={cn('line-clamp-3 break-words', isDone && 'line-through')}>
            <SearchHighlight text={task.title} words={searchWords} />
          </span>
        </button>

        {task.description ? (
          <p className="line-clamp-2 text-[11.5px] leading-normal break-words text-task-ink-faint">
            <SearchHighlight text={task.description} words={searchWords} />
          </p>
        ) : null}

        <TaskCardRecordChips links={task.entityLinks} />
      </div>

      <TaskCardEmailSources references={task.emailReferences} searchWords={searchWords} />

      <TaskCardFoot
        task={task}
        now={now}
        isBusy={isBusy}
        onShiftDueDate={onShiftDueDate}
        onCourtChange={onCourtChange}
      />
    </div>
  );
}
