import { cn } from '@/app/lib/utils';
import type { EmailMeetingResponse } from '@/modules/email/components/email-row-card';
import { format, isSameDay, isValid, parseISO } from 'date-fns';
import { CalendarCheck2, CalendarClock, CalendarX2 } from 'lucide-react';

interface EmailMeetingResponseStripProps {
  response: EmailMeetingResponse;
  collapsed?: boolean;
}

const RESPONSE_COPY: Record<EmailMeetingResponse['status'], string> = {
  accepted: 'accepted',
  tentative: 'tentatively accepted',
  declined: 'declined',
  cancelled: 'cancelled the meeting',
};

const RESPONSE_ICONS = {
  accepted: CalendarCheck2,
  tentative: CalendarClock,
  declined: CalendarX2,
  cancelled: CalendarX2,
} satisfies Record<EmailMeetingResponse['status'], typeof CalendarCheck2>;

export function EmailMeetingResponseStrip({
  response,
  collapsed = false,
}: EmailMeetingResponseStripProps) {
  const Icon = RESPONSE_ICONS[response.status];
  const schedule = formatMeetingSchedule(response);
  const label = `${response.responderName} ${RESPONSE_COPY[response.status]}${
    schedule ? ` for ${schedule}` : ''
  }`;

  return (
    <div
      className={cn(
        'flex min-h-10 items-center gap-2 bg-muted/45 px-4 py-2 text-sm text-foreground',
        collapsed ? 'border-t border-border' : 'border-b border-border'
      )}
    >
      <Icon
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.8}
      />
      <p className="min-w-0 leading-5">{label}</p>
    </div>
  );
}

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
