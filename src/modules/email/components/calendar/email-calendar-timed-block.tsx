import { cn } from '@/app/lib/utils';
import {
  CALENDAR_END_HOUR,
  CALENDAR_HOUR_HEIGHT,
  CALENDAR_START_HOUR,
} from '@/modules/email/components/calendar/email-calendar-grid';
import { CalendarQuickActions } from '@/modules/email/components/calendar/email-calendar-quick-actions';
import {
  CALENDAR_EVENT_STYLES,
  type CalendarEvent,
} from '@/modules/email/components/calendar/email-calendar-types';
import { differenceInMinutes, format, startOfDay } from 'date-fns';
import { CalendarClock, CheckCircle2 } from 'lucide-react';

interface TimedBlockProps {
  event: CalendarEvent;
  /** 0-indexed column within a collision cluster. */
  column: number;
  /** Total columns the cluster is split into. */
  totalColumns: number;
  /** Slot indent variant — Week uses "tight", Day uses "roomy". */
  density: 'tight' | 'roomy';
  onEdit: (event: CalendarEvent) => void;
  onDuplicate: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onToggleDone: (event: CalendarEvent) => void;
}

/**
 * The event pill inside the timeline. Handles three concerns:
 *
 *   1. Vertical geometry — top/height derived from start/end.
 *   2. Horizontal geometry — column-based layout for overlaps.
 *   3. Hover UX — quick-actions strip revealed below the card.
 *
 * When `event.done` is true the card dims, the title strikes through, the
 * tone rail desaturates, and a small check badge appears next to the title —
 * so a completed event still reads as a real block on the timeline but is
 * clearly settled.
 */
export function TimedEventBlock({
  event,
  column,
  totalColumns,
  density,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleDone,
}: TimedBlockProps) {
  const style = CALENDAR_EVENT_STYLES[event.color];
  const dayStart = startOfDay(event.start);
  const gridStart = CALENDAR_START_HOUR * 60;
  const gridEnd = CALENDAR_END_HOUR * 60;
  const startMinutes = differenceInMinutes(event.start, dayStart);
  const endMinutes = Math.max(startMinutes + 15, differenceInMinutes(event.end, dayStart));

  // An event that runs past midnight is clamped to the end of its start day so
  // it can never paint outside the grid.
  const clampedStart = Math.min(Math.max(startMinutes, gridStart), gridEnd - 15);
  const clampedEnd = Math.max(Math.min(endMinutes, gridEnd), clampedStart + 15);
  const top = ((clampedStart - gridStart) / 60) * CALENDAR_HOUR_HEIGHT;
  const height = Math.max(
    density === 'roomy' ? 28 : 22,
    ((clampedEnd - clampedStart) / 60) * CALENDAR_HOUR_HEIGHT - 4
  );

  // Concurrent events share the day column as clean side-by-side lanes
  // (Outlook-style) — no visual overlap. The narrow-width text handling below
  // keeps thin lanes readable, and hover shows the full title + time.
  const widthPct = 100 / totalColumns;
  const leftPct = column * widthPct;

  const timeLabel = `${format(event.start, 'h:mm a').toLowerCase()} – ${format(event.end, 'h:mm a').toLowerCase()}`;
  const compactTimeLabel = `${format(event.start, 'h:mma').toLowerCase()}–${format(event.end, 'h:mma').toLowerCase()}`;
  const roomy = density === 'roomy';
  const done = !!event.done;

  const layout =
    height >= (roomy ? 96 : 84)
      ? 'stacked3'
      : height >= 66
        ? 'stacked2'
        : height >= 48
          ? 'stacked1'
          : 'inline';

  const isInline = layout === 'inline';
  const paddingClass = isInline
    ? roomy
      ? 'pl-3 pr-2 py-1'
      : 'pl-2.5 pr-1.5 py-0.5'
    : roomy
      ? 'pl-3 pr-2 py-2'
      : 'pl-2.5 pr-1.5 py-1.5';

  const titleClass = cn(
    'relative min-w-0 flex-1 truncate font-semibold leading-tight',
    roomy ? 'text-sm' : 'text-xs',
    done ? 'text-muted-foreground line-through decoration-muted-foreground/70' : 'text-foreground'
  );

  return (
    <div
      className="group absolute @container hover:z-30 focus-within:z-30"
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
    >
      <div
        className={cn(
          'relative flex h-full min-w-0 cursor-pointer overflow-hidden rounded-md border border-border bg-background text-left shadow-sm transition-[opacity,filter,box-shadow]',
          'hover:z-30 hover:shadow-lg focus-visible:z-30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          isInline ? 'items-center gap-2' : 'flex-col',
          paddingClass,
          done && 'opacity-70 grayscale-[35%] hover:opacity-95 hover:grayscale-0'
        )}
        role="button"
        tabIndex={0}
        aria-pressed={done}
        title={`${event.title} · ${timeLabel}`}
        onClick={() => onEdit(event)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit(event);
          }
        }}
      >
        <span
          className={cn(
            'pointer-events-none absolute inset-0 transition-opacity',
            style.bg,
            done ? 'opacity-25' : 'opacity-60'
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            'absolute inset-y-0 left-0 w-1 transition-colors',
            done ? 'bg-muted-foreground/40' : style.accent
          )}
          aria-hidden="true"
        />

        {isInline ? (
          <>
            <p className={titleClass}>
              {done && (
                <CheckCircle2
                  aria-hidden="true"
                  className={cn(
                    'mr-1 inline-block align-[-2px] text-emerald-600 dark:text-emerald-400',
                    roomy ? 'size-3.5' : 'size-3'
                  )}
                />
              )}
              {event.title}
            </p>
            <span
              className={cn(
                // On a narrow pill (overlap column) the clipped time reads as
                // garbage — drop it and let the title own the width. The full
                // range still shows in the edit dialog and on wider layouts.
                'relative hidden shrink-0 font-medium tabular-nums @min-[9rem]:inline',
                roomy ? 'text-[11px]' : 'text-[10px]',
                done ? 'text-muted-foreground/70' : 'text-muted-foreground'
              )}
            >
              {compactTimeLabel}
            </span>
          </>
        ) : (
          <>
            <p
              className={cn(
                'relative flex items-center gap-1 truncate font-semibold leading-tight',
                roomy ? 'text-sm' : 'text-xs',
                done
                  ? 'text-muted-foreground line-through decoration-muted-foreground/70'
                  : 'text-foreground'
              )}
            >
              {done && (
                <CheckCircle2
                  aria-hidden="true"
                  className={cn(
                    'shrink-0 text-emerald-600 dark:text-emerald-400',
                    roomy ? 'size-3.5' : 'size-3'
                  )}
                />
              )}
              <span className="min-w-0 truncate">{event.title}</span>
            </p>
            <p
              className={cn(
                'relative mt-0.5 flex items-center gap-1 truncate font-medium tabular-nums',
                roomy ? 'text-[11px]' : 'text-[10px]',
                done ? 'text-muted-foreground/70' : 'text-muted-foreground'
              )}
            >
              <CalendarClock
                aria-hidden="true"
                className="hidden size-3 shrink-0 @min-[7rem]:block"
              />
              {/* A clipped "5:30 pm – 7:3…" reads worse than just the start
                  time — swap to start-only when the block is narrow. */}
              <span className="hidden truncate @min-[9rem]:inline">{timeLabel}</span>
              <span className="truncate @min-[9rem]:hidden">
                {format(event.start, 'h:mm a').toLowerCase()}
              </span>
            </p>
            {(layout === 'stacked2' || layout === 'stacked3') && event.location && (
              <p
                className={cn(
                  'relative mt-0.5 hidden truncate @min-[10rem]:block',
                  roomy ? 'text-[11px]' : 'text-[10px]',
                  done ? 'text-muted-foreground/60' : 'text-muted-foreground/80'
                )}
              >
                {event.location}
              </p>
            )}
            {layout === 'stacked3' && event.organizer && (
              <p
                className={cn(
                  'relative hidden truncate text-[11px] @min-[10rem]:block',
                  done ? 'text-muted-foreground/50' : 'text-muted-foreground/70'
                )}
              >
                Organized by {event.organizer}
              </p>
            )}
            {done && !isInline && layout !== 'stacked1' && (
              <span
                className={cn(
                  'relative mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300'
                )}
              >
                <CheckCircle2 aria-hidden="true" className="size-2.5" />
                Done
              </span>
            )}
          </>
        )}
      </div>

      {/* Hover bridge — see calendar-quick-actions comment for why this exists. */}
      <span
        aria-hidden="true"
        className="pointer-events-auto absolute inset-x-0 top-full h-2 z-30"
      />

      <CalendarQuickActions
        done={done}
        onEdit={() => onEdit(event)}
        onDuplicate={() => onDuplicate(event)}
        onDelete={() => onDelete(event)}
        onToggleDone={() => onToggleDone(event)}
      />
    </div>
  );
}
