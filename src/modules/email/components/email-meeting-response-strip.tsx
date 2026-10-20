import { cn } from '@/app/lib/utils';
import type { EmailMeetingResponse } from '@/modules/email/components/email-row-card';
import {
  getMeetingResponseLabel,
  MEETING_RESPONSE_ICONS,
} from '@/modules/email/lib/email-meeting-response';

interface EmailMeetingResponseStripProps {
  response: EmailMeetingResponse;
  collapsed?: boolean;
}

export function EmailMeetingResponseStrip({
  response,
  collapsed = false,
}: EmailMeetingResponseStripProps) {
  const Icon = MEETING_RESPONSE_ICONS[response.status];
  const label = getMeetingResponseLabel(response);

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
