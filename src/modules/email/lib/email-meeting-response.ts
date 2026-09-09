import type { EmailMeetingResponse } from '@/modules/email/components/email-row-card';
import { format, isSameDay, isValid, parseISO } from 'date-fns';
import { CalendarCheck2, CalendarClock, CalendarX2 } from 'lucide-react';

/**
 * How a meeting response is worded and iconed, in one place: the message list
 * row and the thread strip both show it, and they must not drift apart.
 */
export const MEETING_RESPONSE_COPY: Record<EmailMeetingResponse['status'], string> = {
  accepted: 'accepted',
  tentative: 'tentatively accepted',
  declined: 'declined',
  cancelled: 'cancelled the meeting',
};

export const MEETING_RESPONSE_ICONS = {
  accepted: CalendarCheck2,
  tentative: CalendarClock,
  declined: CalendarX2,
  cancelled: CalendarX2,
} satisfies Record<EmailMeetingResponse['status'], typeof CalendarCheck2>;

/** "Sharun Test accepted" — what Outlook shows in place of the empty body. */
export function getMeetingResponseLabel(response: EmailMeetingResponse): string {
  const schedule = formatMeetingSchedule(response);
  return `${response.responderName} ${MEETING_RESPONSE_COPY[response.status]}${
    schedule ? ` for ${schedule}` : ''
  }`;
}

/**
 * Only one occurrence of a recurring meeting was answered, so which one matters.
 * A response to the whole series needs no date.
 */
function formatMeetingSchedule(response: EmailMeetingResponse): string | null {
  const eventType = response.eventType?.toLowerCase();
  if (eventType !== 'occurrence' && eventType !== 'occurence' && eventType !== 'exception') {
    return null;
  }
  if (!response.startAt || !response.endAt) return null;

  const start = parseISO(response.startAt);
  const end = parseISO(response.endAt);
  if (!isValid(start) || !isValid(end)) return null;

  return isSameDay(start, end)
    ? `${format(start, 'EEE, MMM d, yyyy, h:mm a')} – ${format(end, 'h:mm a')}`
    : `${format(start, 'EEE, MMM d, yyyy, h:mm a')} – ${format(end, 'EEE, MMM d, yyyy, h:mm a')}`;
}
