import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import { CALENDAR_EVENT_STYLES } from '@/modules/email/components/calendar/email-calendar-types';
import {
  splitTaskRecordChips,
  taskRecordChipColor,
  taskRecordChipText,
  taskRecordChipTitle,
} from '@/modules/tasks/lib/task-record-chips';
import type { TaskEntityLink } from '@/modules/tasks/schemas/task.schema';

function ChipLabel({ link }: { link: TaskEntityLink }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 shrink-0 rounded-[2px]',
          CALENDAR_EVENT_STYLES[taskRecordChipColor(link.entityId)].accent
        )}
      />
      <span
        className={cn('min-w-0 truncate leading-none', !link.label && 'italic text-task-ink-faint')}
      >
        {taskRecordChipText(link)}
      </span>
    </>
  );
}

const linkKey = (link: TaskEntityLink) => `${link.entityType}-${link.entityId}`;

/**
 * The projects and records a task is linked to, as named chips, drawn to the
 * TaskCard design (elli-ui#1479): a coloured dot and the name — the first chip
 * a little wider than the second — then a dashed `+N` that opens every one of
 * them in a list.
 */
export function TaskCardRecordChips({ links }: { links: readonly TaskEntityLink[] }) {
  if (links.length === 0) return null;
  const { shown, hidden } = splitTaskRecordChips(links);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <ul className="flex min-w-0 items-center gap-1.5" aria-label="Linked items">
        {shown.map((link, index) => (
          <li
            key={linkKey(link)}
            title={taskRecordChipTitle(link)}
            className={cn(
              'inline-flex h-5 min-w-0 flex-[0_1_auto] items-center gap-[5px] rounded-full bg-task-chip pr-2 pl-[7px] text-[10.5px] font-medium text-task-ink-soft',
              index === 0 ? 'max-w-35' : 'max-w-27.5'
            )}
          >
            <ChipLabel link={link} />
          </li>
        ))}
      </ul>

      {hidden.length > 0 ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              // The whole card is a drag handle; see TaskAssigneeMenu.
              onPointerDown={(event) => event.stopPropagation()}
              aria-label={`Show all ${links.length} linked items`}
              className="h-5 shrink-0 cursor-pointer whitespace-nowrap rounded-full border border-dashed border-task-ring px-[7px] text-[10.5px] leading-none font-medium text-task-ink-faint hover:border-solid hover:bg-task-chip hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-court-ours data-[state=open]:border-solid data-[state=open]:bg-task-chip data-[state=open]:text-foreground"
            >
              +{hidden.length}
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-auto min-w-50 max-w-72 rounded-[10px] border-task-card-line bg-task-card p-1 shadow-task-pop"
          >
            <ul aria-label="Linked items" className="flex flex-col">
              {links.map((link) => (
                <li
                  key={linkKey(link)}
                  title={taskRecordChipTitle(link)}
                  className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-task-ink-soft hover:bg-task-mail-back"
                >
                  <ChipLabel link={link} />
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}
