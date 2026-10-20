import { cn } from '@/app/lib/utils';
import {
  CALENDAR_EVENT_STYLES,
  type CalendarEvent,
} from '@/modules/email/components/calendar/email-calendar-types';
import { addDays, startOfDay } from 'date-fns';

/**
 * All-day chips pinned under the week/day header. The timeline filters allDay
 * events out of the hour grid — without this row they would be invisible
 * outside the month view.
 */
export function CalendarAllDayRow({
  days,
  events,
  onEdit,
  density = 'tight',
}: {
  days: Date[];
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
  /** Matches TimedEventBlock: week is "tight" (text-xs), day is "roomy" (text-sm). */
  density?: 'tight' | 'roomy';
}) {
  const allDay = events.filter((event) => event.allDay);
  if (allDay.length === 0) return null;
  const byDay = days.map((day) =>
    allDay
      .filter((event) => coversDay(event, day))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  );
  if (byDay.every((list) => list.length === 0)) return null;

  return (
    <div
      className={cn(
        'grid border-b border-border bg-background',
        days.length === 1
          ? 'grid-cols-[64px_minmax(0,1fr)]'
          : 'grid-cols-[64px_repeat(7,minmax(0,1fr))]'
      )}
    >
      <div
        className="flex items-start justify-end border-r border-border pr-2 pt-1.5 text-[10px] font-medium text-muted-foreground"
        aria-hidden="true"
      >
        all day
      </div>
      {byDay.map((list, index) => (
        <div
          key={days[index]!.toISOString()}
          className="flex min-w-0 flex-col gap-0.5 border-r border-border p-1"
        >
          {list.map((event) => (
            <AllDayChip key={event.id} event={event} onEdit={onEdit} density={density} />
          ))}
        </div>
      ))}
    </div>
  );
}

function AllDayChip({
  event,
  onEdit,
  density,
}: {
  event: CalendarEvent;
  onEdit: (event: CalendarEvent) => void;
  density: 'tight' | 'roomy';
}) {
  const style = CALENDAR_EVENT_STYLES[event.color];
  return (
    <button
      type="button"
      title={`${event.title} · All day`}
      onClick={() => onEdit(event)}
      className={cn(
        // Text size tracks the timed blocks of the same view so the all-day
        // row and the timeline read as one surface.
        'flex min-w-0 cursor-pointer items-center rounded-sm border text-left font-semibold leading-tight',
        density === 'roomy' ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-xs',
        'hover:shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        style.bg,
        style.border,
        event.done && 'opacity-70'
      )}
    >
      <span className={cn('min-w-0 truncate', style.text, event.done && 'line-through')}>
        {event.title}
      </span>
    </button>
  );
}

function coversDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = startOfDay(addDays(day, 1));
  // All-day windows are [start, end) — end exclusive. Guard against a
  // degenerate end (== start) so a malformed record still shows on its day.
  const end = event.end > event.start ? event.end : addDays(event.start, 1);
  return event.start < dayEnd && end > dayStart;
}
