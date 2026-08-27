import {
  CALENDAR_END_HOUR,
  CALENDAR_HOUR_HEIGHT,
  CALENDAR_HOURS,
  CALENDAR_START_HOUR,
  formatCalendarHour,
} from '@/modules/email/components/calendar/email-calendar-grid';

// Visual chrome shared by the week and day timeline views. Geometry constants
// live in email-calendar-grid.ts.

export function CalendarHourRail() {
  return (
    <div className="relative border-r border-border" aria-hidden="true">
      {CALENDAR_HOURS.map((hour) => (
        <div
          key={hour}
          className="relative flex items-start justify-end pr-2 pt-1 text-[10px] font-medium tabular-nums text-muted-foreground"
          style={{ height: CALENDAR_HOUR_HEIGHT }}
        >
          {/* Label sits INSIDE the hour cell (no upward translate, no
              background mask) so it never overpaints the header border or the
              hour-line above it. Matches Google Calendar's rail convention. */}
          <span>{formatCalendarHour(hour)}</span>
        </div>
      ))}
    </div>
  );
}

/** The horizontal hour lines painted inside a day column. */
export function CalendarHourLines() {
  return (
    <>
      {CALENDAR_HOURS.map((hour, index) => (
        <div
          key={hour}
          className={
            index === 0
              ? 'absolute inset-x-0 border-t border-transparent'
              : 'absolute inset-x-0 border-t border-border/60'
          }
          style={{ top: index * CALENDAR_HOUR_HEIGHT }}
        />
      ))}
    </>
  );
}

export function CalendarNowIndicator() {
  const now = new Date();
  const minutesFromStart = (now.getHours() - CALENDAR_START_HOUR) * 60 + now.getMinutes();
  if (minutesFromStart < 0 || minutesFromStart > (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60) {
    return null;
  }
  const top = (minutesFromStart / 60) * CALENDAR_HOUR_HEIGHT;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
      style={{ top }}
      aria-hidden="true"
    >
      <span className="size-2 shrink-0 rounded-full bg-primary shadow-sm ring-2 ring-background" />
      <span className="h-px flex-1 bg-primary/70" />
    </div>
  );
}
