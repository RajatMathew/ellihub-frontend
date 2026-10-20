import { cn } from '@/app/lib/utils';
import { layoutOverlappingEvents } from '@/modules/email/components/calendar/calendar-collisions';
import { CalendarAllDayRow } from '@/modules/email/components/calendar/email-calendar-allday-row';
import {
  CALENDAR_HOUR_HEIGHT,
  CALENDAR_HOURS,
  useScrollToWorkday,
} from '@/modules/email/components/calendar/email-calendar-grid';
import {
  CalendarHourLines,
  CalendarHourRail,
  CalendarNowIndicator,
  CalendarSlotLayer,
} from '@/modules/email/components/calendar/email-calendar-grid-chrome';
import { TimedEventBlock } from '@/modules/email/components/calendar/email-calendar-timed-block';
import type { CalendarEvent } from '@/modules/email/components/calendar/email-calendar-types';
import { timedPiecesForDay } from '@/modules/email/lib/calendar-day-pieces';
import { eachDayOfInterval, endOfWeek, format, isToday, isWeekend, startOfWeek } from 'date-fns';

interface EmailCalendarWeekViewProps {
  cursor: Date;
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
  onDuplicate: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onToggleDone: (event: CalendarEvent) => void;
  /** Click-to-add: an empty-slot click opens the create dialog at that time. */
  onCreateSlot?: (start: Date) => void;
}

export function EmailCalendarWeekView({
  cursor,
  events,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleDone,
  onCreateSlot,
}: EmailCalendarWeekViewProps) {
  const weekStart = startOfWeek(cursor, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(cursor, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const scrollRef = useScrollToWorkday();

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header lives INSIDE the scroll container as sticky so the header grid
          and the body grid share the same inner width. If the header sat
          outside, a body scrollbar would shrink the body by ~15px and column
          joins would jog against the header. */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-background">
        {/* Header + all-day row share one sticky block so the pinned chrome
            stays aligned with the columns while the hour grid scrolls. */}
        <div className="sticky top-0 z-20 bg-background">
          <WeekHeader days={days} />
          <CalendarAllDayRow days={days} events={events} onEdit={onEdit} />
        </div>
        {/* `isolate` scopes the event z-indices to the grid: a hovered card lifts
            to z-30 over its neighbours, but must stay under the sticky header
            (z-20) above, or its scrolled-off top paints over the dates. */}
        <div
          className="relative isolate grid grid-cols-[64px_repeat(7,minmax(0,1fr))]"
          style={{ minHeight: CALENDAR_HOURS.length * CALENDAR_HOUR_HEIGHT }}
        >
          <CalendarHourRail />
          {days.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              events={events}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onToggleDone={onToggleDone}
              onCreateSlot={onCreateSlot}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekHeader({ days }: { days: Date[] }) {
  return (
    <div className="grid shrink-0 grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-border bg-background">
      <div className="border-r border-border" aria-hidden="true" />
      {days.map((day) => {
        const today = isToday(day);
        return (
          <div
            key={day.toISOString()}
            className={cn(
              'flex flex-col items-center gap-0.5 border-r border-border py-2 text-center',
              isWeekend(day) && 'bg-muted/20'
            )}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {format(day, 'EEE')}
            </span>
            <span
              className={cn(
                'inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                today ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground'
              )}
            >
              {format(day, 'd')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface DayColumnProps {
  day: Date;
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
  onDuplicate: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onToggleDone: (event: CalendarEvent) => void;
  onCreateSlot?: (start: Date) => void;
}

function DayColumn({
  day,
  events,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleDone,
  onCreateSlot,
}: DayColumnProps) {
  const highlightToday = isToday(day);
  // One piece per event touching this day, so a night shift shows on both.
  const laidOut = layoutOverlappingEvents(timedPiecesForDay(events, day));

  return (
    <div
      className={cn(
        'relative border-r border-border',
        isWeekend(day) && 'bg-muted/20',
        highlightToday && 'bg-primary/[0.03]'
      )}
    >
      <CalendarHourLines />
      <CalendarSlotLayer day={day} onCreateSlot={onCreateSlot} />

      {highlightToday && <CalendarNowIndicator />}

      {laidOut.map(({ event: piece, column, totalColumns }) => (
        <TimedEventBlock
          key={piece.event.id}
          event={piece.event}
          segment={piece}
          column={column}
          totalColumns={totalColumns}
          density="tight"
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onToggleDone={onToggleDone}
        />
      ))}
    </div>
  );
}
