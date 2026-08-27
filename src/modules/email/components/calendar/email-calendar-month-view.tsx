import { cn } from '@/app/lib/utils';
import {
  CALENDAR_EVENT_STYLES,
  type CalendarEvent,
} from '@/modules/email/components/calendar/email-calendar-types';
import type { CalendarView } from '@/modules/email/components/calendar/email-calendar-view';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_EVENTS_PER_CELL = 3;

interface EmailCalendarMonthViewProps {
  cursor: Date;
  events: CalendarEvent[];
  onSelectDay?: (day: Date) => void;
  onSwitchView?: (view: CalendarView) => void;
}

export function EmailCalendarMonthView({
  cursor,
  events,
  onSelectDay,
  onSwitchView,
}: EmailCalendarMonthViewProps) {
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const rows: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    rows.push(days.slice(index, index + 7));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Weekday header */}
      <div className="grid shrink-0 grid-cols-7 border-b border-border bg-background">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid min-h-0 flex-1 grid-rows-[repeat(6,minmax(0,1fr))]">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-7">
            {row.map((day) => {
              const inMonth = isSameMonth(day, cursor);
              const today = isToday(day);
              const dayEvents = events
                .filter((event) => isEventOnDay(event, day))
                .sort((a, b) => a.start.getTime() - b.start.getTime());
              const visible = dayEvents.slice(0, MAX_EVENTS_PER_CELL);
              const overflow = dayEvents.length - visible.length;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onSelectDay?.(day);
                    onSwitchView?.('day');
                  }}
                  className={cn(
                    'group relative flex min-h-24 min-w-0 flex-col gap-1 border-b border-r border-border bg-background p-1.5 text-left transition-colors',
                    'hover:bg-accent/40 focus-visible:z-10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    !inMonth && 'bg-muted/40 text-muted-foreground',
                    isWeekend(day) && inMonth && 'bg-muted/20'
                  )}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                        today
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : inMonth
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && !today && (
                      <span
                        className="text-[10px] font-medium tabular-nums text-muted-foreground"
                        aria-label={`${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}
                      >
                        {dayEvents.length}
                      </span>
                    )}
                  </span>

                  <ul className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                    {visible.map((event) => (
                      <li key={event.id}>
                        <MonthEventChip event={event} />
                      </li>
                    ))}
                    {overflow > 0 && (
                      <li className="mt-auto text-[10px] font-medium text-muted-foreground">
                        + {overflow} more
                      </li>
                    )}
                  </ul>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthEventChip({ event }: { event: CalendarEvent }) {
  const style = CALENDAR_EVENT_STYLES[event.color];
  const timeLabel = event.allDay ? 'All day' : format(event.start, 'h:mm a').toLowerCase();

  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1 rounded-sm border border-border/60 bg-background px-1.5 py-0.5 text-[11px] font-medium leading-tight text-foreground'
      )}
      title={`${event.title} · ${timeLabel}`}
    >
      <span
        className={cn('inline-block size-1.5 shrink-0 rounded-full', style.accent)}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">
        {!event.allDay && (
          <span className="mr-1 font-mono tabular-nums text-muted-foreground">{timeLabel}</span>
        )}
        {event.title}
      </span>
    </span>
  );
}

function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = startOfDay(addDays(day, 1));
  if (event.allDay) {
    // Interpret allDay as [start, end) — end exclusive. Guard against a
    // degenerate end (== start) so a malformed record still shows on its day.
    const end = event.end > event.start ? event.end : addDays(event.start, 1);
    return event.start < dayEnd && end > dayStart;
  }
  return isSameDay(event.start, day);
}
