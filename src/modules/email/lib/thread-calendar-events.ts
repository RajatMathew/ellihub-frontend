import type {
  CalendarEventEmailLink,
  CalendarSelectionRow,
  CalendarSummary,
} from '@/modules/email/api';
import { parseEventDate } from '@/modules/email/components/calendar/email-calendar-types';
import { format, isSameYear } from 'date-fns';

/**
 * The rules behind "Calendar events" on a thread (elli-ui#1305): what a new
 * event starts from, how a linked one is labelled, and where the reader can
 * put it. Pure, so they are tested without the panel.
 */

/**
 * A copied event date as a Date. An all-day date is a calendar day: only its
 * first ten characters are read, so one stored as UTC midnight
 * (`2026-10-14T00:00:00Z`) is still the 14th in New York, not the 13th.
 */
function eventDate(value: string, allDay: boolean): Date {
  return parseEventDate(allDay ? value.slice(0, 10) : value);
}

const REPLY_PREFIX = /^\s*(?:re|fw|fwd|aw|wg)\s*:\s*/i;

/** "RE: FW: Plywood delivery" → "Plywood delivery". */
export function stripReplyPrefixes(subject: string): string {
  let current = subject;
  while (REPLY_PREFIX.test(current)) current = current.replace(REPLY_PREFIX, '');
  return current.trim();
}

/**
 * What "+ Add event" opens with. The title is the thread's subject without its
 * reply prefixes; the notes say where the event came from, so it still makes
 * sense to someone who meets it in Outlook. All day, because what arrives by
 * email is usually a date — a delivery, a deadline — not a meeting time.
 */
export function threadEventPrefill(email: {
  subject?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
}): { subject: string; description: string; allDay: boolean } {
  const subject = stripReplyPrefixes(email.subject ?? '');
  const sender = email.senderName?.trim() || email.senderEmail?.trim() || '';
  const from =
    sender && email.senderEmail && sender !== email.senderEmail
      ? `${sender} <${email.senderEmail}>`
      : sender;
  return {
    subject,
    description: from ? `From an email by ${from}: "${subject || 'no subject'}"` : '',
    allDay: true,
  };
}

/**
 * The date a linked event is listed under: "Wed, Oct 14" for an all-day event,
 * "Wed, Oct 14 · 9:00 AM" for a timed one, with the year only when it is not
 * this one. An event whose date was never copied reads as such.
 */
export function threadEventWhenLabel(
  link: Pick<CalendarEventEmailLink, 'eventStart' | 'eventIsAllDay'>,
  now: Date = new Date()
): string {
  if (!link.eventStart) return 'Date not set';
  const start = eventDate(link.eventStart, link.eventIsAllDay);
  if (Number.isNaN(start.getTime())) return 'Date not set';
  const day = format(start, isSameYear(start, now) ? 'EEE, MMM d' : 'EEE, MMM d, yyyy');
  return link.eventIsAllDay ? day : `${day} · ${format(start, 'h:mm a')}`;
}

/**
 * A linked event's date, split for the row: the month and day go on the date
 * tile, the weekday and time on the line under the title. The year is only
 * there when it is not this one. Null when no date was copied.
 */
export function threadEventDateParts(
  link: Pick<CalendarEventEmailLink, 'eventStart' | 'eventIsAllDay'>,
  now: Date = new Date()
): { month: string; day: string; detail: string } | null {
  if (!link.eventStart) return null;
  const start = eventDate(link.eventStart, link.eventIsAllDay);
  if (Number.isNaN(start.getTime())) return null;
  const parts = [
    format(start, 'EEE'),
    link.eventIsAllDay ? 'All day' : format(start, 'h:mm a'),
    ...(isSameYear(start, now) ? [] : [format(start, 'yyyy')]),
  ];
  return { month: format(start, 'MMM'), day: format(start, 'd'), detail: parts.join(' · ') };
}

/** Whether the event is over, so the list can quiet it rather than hide it. */
export function isThreadEventPast(
  link: Pick<CalendarEventEmailLink, 'eventStart' | 'eventEnd' | 'eventIsAllDay'>,
  now: Date = new Date()
): boolean {
  const value = link.eventEnd ?? link.eventStart;
  if (!value) return false;
  const end = eventDate(value, link.eventIsAllDay);
  if (Number.isNaN(end.getTime())) return false;
  // An all-day end is exclusive: an event on the 14th ends at the start of the 15th.
  return end.getTime() <= now.getTime();
}

/**
 * The calendars an event from this thread can go in.
 *
 * The calendars the reader has picked for this mailbox, minus the read-only
 * ones — the same list the Calendar tab offers. Someone who has never opened
 * the Calendar tab has picked none, and "+ Add event" should not be a dead end
 * for them, so it falls back to every writable calendar the mailbox has.
 */
export function writableCalendarOptions(
  selection: readonly CalendarSelectionRow[] | undefined,
  calendars: readonly CalendarSummary[] | undefined
): CalendarSelectionRow[] {
  const readOnly = new Set((calendars ?? []).filter((cal) => cal.readOnly).map((cal) => cal.id));
  const picked = (selection ?? []).filter((row) => !readOnly.has(row.aurinkoCalendarId));
  if (picked.length > 0) return picked;
  return (calendars ?? [])
    .filter((cal) => !cal.readOnly)
    .map((cal) => ({
      aurinkoCalendarId: cal.id,
      name: cal.name,
      color: cal.color ?? null,
      isPrimary: Boolean(cal.isPrimary),
      hidden: false,
    }));
}

/** Soonest first; the ones already past sink below the ones still to come. */
export function orderThreadEvents(
  links: readonly CalendarEventEmailLink[],
  now: Date = new Date()
): CalendarEventEmailLink[] {
  const time = (link: CalendarEventEmailLink) =>
    link.eventStart
      ? eventDate(link.eventStart, link.eventIsAllDay).getTime()
      : Number.POSITIVE_INFINITY;
  return [...links].sort((a, b) => {
    const pastA = isThreadEventPast(a, now);
    const pastB = isThreadEventPast(b, now);
    if (pastA !== pastB) return pastA ? 1 : -1;
    return pastA ? time(b) - time(a) : time(a) - time(b);
  });
}
