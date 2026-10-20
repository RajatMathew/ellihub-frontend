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
import { format, isToday } from 'date-fns';

interface EmailCalendarDayViewProps {
  cursor: Date;
  events: CalendarEvent[];
  onEdit: (event: CalendarEvent) => void;
  onDuplicate: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onToggleDone: (event: CalendarEvent) => void;
  /** Click-to-add: an empty-slot click opens the create dialog at that time. */
  onCreateSlot?: (start: Date) => void;
}

export function EmailCalendarDayView({
  cursor,
  events,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleDone,
  onCreateSlot,
}: EmailCalendarDayViewProps) {
  // One piece per event touching this day, so an overnight event shows on
  // the morning it ends as well as the night it starts.
  const laidOut = layoutOverlappingEvents(timedPiecesForDay(events, cursor));
  const highlightToday = isToday(cursor);
  const scrollRef = useScrollToWorkday();

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header inside the scroll container so its grid width matches the
          body grid exactly — otherwise a body scrollbar makes column joins
          jog against the header's bottom border. */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-background">
        {/* Header + all-day row share one sticky block so the pinned chrome
            stays aligned with the column while the hour grid scrolls. */}
        <div className="sticky top-0 z-20 bg-background">
          <DayHeader cursor={cursor} highlightToday={highlightToday} />
          <CalendarAllDayRow days={[cursor]} events={events} onEdit={onEdit} density="roomy" />
        </div>
        {/* `isolate` scopes the event z-indices to the grid: a hovered card lifts
            to z-30 over its neighbours, but must stay under the sticky header
            (z-20) above, or its scrolled-off top paints over the dates. */}
        <div
          className="relative isolate grid grid-cols-[64px_minmax(0,1fr)]"
          style={{ minHeight: CALENDAR_HOURS.length * CALENDAR_HOUR_HEIGHT }}
        >
          <CalendarHourRail />
          <div
            className={cn('relative border-r border-border', highlightToday && 'bg-primary/[0.03]')}
          >
            <CalendarHourLines />
            <CalendarSlotLayer day={cursor} onCreateSlot={onCreateSlot} />

            {highlightToday && <CalendarNowIndicator />}

            {laidOut.map(({ event: piece, column, totalColumns }) => (
              <TimedEventBlock
                key={piece.event.id}
                event={piece.event}
                segment={piece}
                column={column}
                totalColumns={totalColumns}
                density="roomy"
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onToggleDone={onToggleDone}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayHeader({ cursor, highlightToday }: { cursor: Date; highlightToday: boolean }) {
  return (
    <div className="grid shrink-0 grid-cols-[64px_minmax(0,1fr)] border-b border-border bg-background">
      <div className="border-r border-border" aria-hidden="true" />
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {format(cursor, 'EEEE')}
        </span>
        <span
          className={cn(
            'inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
            highlightToday ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground'
          )}
        >
          {format(cursor, 'd')}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {format(cursor, 'MMMM yyyy')}
        </span>
      </div>
    </div>
  );
}
