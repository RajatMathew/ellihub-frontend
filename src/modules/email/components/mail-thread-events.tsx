import { cn } from '@/app/lib/utils';
import type { CalendarEventEmailLink } from '@/modules/email/api';
import {
  isThreadEventPast,
  orderThreadEvents,
  threadEventDateParts,
} from '@/modules/email/lib/thread-calendar-events';
import { CalendarDays, LoaderCircle } from 'lucide-react';

/**
 * The calendar events made from the open thread (elli-ui#1305) — a vendor's
 * delivery date, a site visit.
 *
 * Each row leads with a small date tile, month over day, so the list reads as
 * dates at a glance; the title takes the rest of the line and the weekday and
 * time sit quieter beneath it. A row opens the event in the same dialog the
 * Calendar tab uses. One already over stays in the list but fades, below the
 * ones still to come.
 */
export function MailThreadEvents({
  events,
  openingId = null,
  now = new Date(),
  onOpen,
}: {
  events: readonly CalendarEventEmailLink[];
  /** The row whose event is being fetched to open. */
  openingId?: string | null;
  now?: Date;
  onOpen?: (link: CalendarEventEmailLink) => void;
}) {
  if (events.length === 0) {
    return (
      <p className="pb-1 text-[12.5px] text-mail-muted">No events created from this thread.</p>
    );
  }

  return (
    <ul className="min-w-0 space-y-1 pb-1">
      {orderThreadEvents(events, now).map((link) => {
        const past = isThreadEventPast(link, now);
        const opening = openingId === link.id;
        const title = link.eventSubject?.trim() || '(No title)';
        const date = threadEventDateParts(link, now);

        return (
          <li key={link.id} className="min-w-0">
            <button
              type="button"
              disabled={!onOpen || opening}
              onClick={() => onOpen?.(link)}
              aria-label={`${title}${date ? `, ${date.month} ${date.day}, ${date.detail}` : ''}`}
              className={cn(
                'flex w-full min-w-0 items-center gap-3 rounded-lg px-1 py-1 text-left',
                'cursor-pointer hover:bg-mail-chip disabled:cursor-default',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                'motion-safe:transition-colors motion-safe:duration-100'
              )}
            >
              <DateTile month={date?.month} day={date?.day} past={past} opening={opening} />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-[13px] font-medium leading-snug',
                    past ? 'text-mail-mid' : 'text-mail-ink'
                  )}
                  title={title}
                >
                  {title}
                </span>
                <span className="mt-0.5 block truncate text-xs leading-4 text-mail-muted">
                  {date ? date.detail : 'Date not set'}
                  {past ? ' · Past' : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Month over day, like a desk calendar page; a spinner while the event opens. */
export function DateTile({
  month,
  day,
  past,
  opening = false,
  compact = false,
}: {
  month?: string;
  day?: string;
  past: boolean;
  opening?: boolean;
  /** The smaller tile the timeline uses under an activity line. */
  compact?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border bg-mail-card',
        compact ? 'size-7' : 'size-9',
        past ? 'border-mail-hair opacity-60' : 'border-mail-pane-line'
      )}
    >
      {opening ? (
        <LoaderCircle className="size-4 animate-spin text-mail-muted" />
      ) : month && day ? (
        <>
          <span
            className={cn(
              'w-full text-center font-bold uppercase tracking-wide',
              compact ? 'text-[8px] leading-[10px]' : 'text-[9px] leading-3',
              past ? 'text-mail-muted' : 'text-link'
            )}
          >
            {month}
          </span>
          <span
            className={cn(
              'font-semibold text-mail-ink',
              compact ? 'text-xs leading-3' : 'text-sm leading-4'
            )}
          >
            {day}
          </span>
        </>
      ) : (
        <CalendarDays className="size-4 text-mail-muted" />
      )}
    </span>
  );
}
