import { cn } from '@/app/lib/utils';
import { DateTile } from '@/modules/email/components/mail-thread-events';
import type { ActivityCalendarEvent } from '@/modules/email/lib/thread-activity';
import {
  isThreadEventPast,
  threadEventDateParts,
} from '@/modules/email/lib/thread-calendar-events';

/**
 * The event an "added calendar event" row made, drawn the way the details
 * panel lists it — a date tile, the title, and the weekday and time beneath —
 * so the timeline says when, not just what. A deleted event stays, struck
 * through and faded, so the thread's history still shows what was there.
 */
export function EmailThreadActivityEvent({
  link,
  now = new Date(),
}: {
  link: ActivityCalendarEvent;
  now?: Date;
}) {
  const past = link.deleted || isThreadEventPast(link, now);
  const title = link.eventSubject?.trim() || '(No title)';
  const date = threadEventDateParts(link, now);
  return (
    <div className="mt-1.5 flex min-w-0 max-w-xs items-center gap-2.5 rounded-md border border-border bg-mail-card px-2 py-1.5">
      <DateTile month={date?.month} day={date?.day} past={past} compact />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[12.5px] font-medium leading-4',
            past ? 'text-mail-mid' : 'text-mail-ink',
            link.deleted && 'line-through'
          )}
          title={title}
        >
          {title}
        </span>
        <span className="block truncate text-[11px] leading-4 text-mail-muted">
          {date ? date.detail : 'Date not set'}
          {link.deleted ? ' · Deleted' : past ? ' · Past' : null}
        </span>
      </span>
    </div>
  );
}
