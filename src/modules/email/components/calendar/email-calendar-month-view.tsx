import { Button } from '@/app/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/app/components/ui/hover-card';
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
import { CheckCircle2, MapPin, Repeat, Video } from 'lucide-react';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_EVENTS_PER_CELL = 3;

interface EmailCalendarMonthViewProps {
  cursor: Date;
  events: CalendarEvent[];
  onSelectDay?: (day: Date) => void;
  onSwitchView?: (view: CalendarView) => void;
  /** Clicking an event chip opens the event dialog instead of the day view. */
  onEditEvent?: (event: CalendarEvent) => void;
  /** Delete action offered from the chip's hover card. */
  onDeleteEvent?: (event: CalendarEvent) => void;
}

export function EmailCalendarMonthView({
  cursor,
  events,
  onSelectDay,
  onSwitchView,
  onEditEvent,
  onDeleteEvent,
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

              const openDay = () => {
                onSelectDay?.(day);
                onSwitchView?.('day');
              };

              return (
                // The cell can't be a <button> — the event chips inside it are
                // buttons themselves and interactive elements must not nest.
                // The cell keeps mouse + keyboard day-navigation via
                // role="button"; chips stop propagation and open the dialog.
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${format(day, 'MMMM d, yyyy')} in day view`}
                  onClick={openDay}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDay();
                    }
                  }}
                  className={cn(
                    'group relative flex min-h-24 min-w-0 cursor-pointer flex-col gap-1 border-b border-r border-border bg-background p-1.5 text-left transition-colors',
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
                        <MonthEventChip
                          event={event}
                          onEdit={onEditEvent}
                          onDelete={onDeleteEvent}
                        />
                      </li>
                    ))}
                    {overflow > 0 && (
                      <li className="mt-auto text-[10px] font-medium text-muted-foreground">
                        + {overflow} more
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthEventChip({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}) {
  const style = CALENDAR_EVENT_STYLES[event.color];
  const timeLabel = event.allDay ? 'All day' : format(event.start, 'h:mm a').toLowerCase();

  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-sm border border-border/60 bg-background px-1.5 py-0.5 text-left text-[11px] font-medium leading-tight text-foreground',
            'hover:shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
          )}
          onClick={(e) => {
            // Don't let the cell's day-view navigation swallow the event click.
            e.stopPropagation();
            onEdit?.(event);
          }}
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
        </button>
      </HoverCardTrigger>
      {/* Portaled content still bubbles clicks through the React tree — stop
          them so a click in the card never triggers the day-cell navigation. */}
      <HoverCardContent
        align="start"
        sideOffset={6}
        className="relative w-80 overflow-hidden rounded-lg p-0 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent rail ties the card to the event's calendar color. */}
        <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', style.accent)} />
        <div className="px-4 pb-3 pt-3.5">
          <div className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className={cn('mt-1.5 size-2 shrink-0 rounded-full', style.accent)}
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-semibold leading-snug text-foreground">
                <span className="min-w-0 truncate">{event.title}</span>
                {event.isRecurring && (
                  <Repeat
                    aria-label="Repeating event"
                    className="size-3 shrink-0 text-muted-foreground"
                  />
                )}
                {event.done && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 aria-hidden="true" className="size-2.5" />
                    Done
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{hoverCardWhen(event)}</p>
            </div>
          </div>
          {(event.location || event.organizer || event.description || event.onlineMeetingUrl) && (
            <div className="mt-2.5 grid gap-1.5 border-t border-border/60 pt-2.5">
              {event.onlineMeetingUrl && (
                <a
                  href={event.onlineMeetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-fit items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Video aria-hidden="true" className="size-3 shrink-0" />
                  Join Teams meeting
                </a>
              )}
              {event.location && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-3 shrink-0" />
                  <span className="min-w-0 truncate">{event.location}</span>
                </p>
              )}
              {event.organizer && (
                <p className="text-xs text-muted-foreground">Organized by {event.organizer}</p>
              )}
              {event.description && (
                <p className="line-clamp-3 text-xs text-muted-foreground/90">{event.description}</p>
              )}
            </div>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(event)}
              >
                Delete
              </Button>
            )}
            {onEdit && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="h-7 px-3"
                onClick={() => onEdit(event)}
              >
                Edit
              </Button>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

/** "Thursday, August 13 · 3:30 pm – 4:30 pm", or the date span for all-day. */
function hoverCardWhen(event: CalendarEvent): string {
  if (event.allDay) {
    // All-day windows are [start, end) — the last covered day is end - 1.
    const lastDay = addDays(event.end, -1);
    if (event.end <= event.start || isSameDay(event.start, lastDay)) {
      return `${format(event.start, 'EEEE, MMMM d')} · All day`;
    }
    return `${format(event.start, 'MMM d')} – ${format(lastDay, 'MMM d')} · All day`;
  }
  return `${format(event.start, 'EEEE, MMMM d')} · ${format(event.start, 'h:mm a').toLowerCase()} – ${format(event.end, 'h:mm a').toLowerCase()}`;
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
