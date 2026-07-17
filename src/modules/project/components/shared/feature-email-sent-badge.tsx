import { Badge } from '@/app/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { formatDateTime } from '@/app/lib/helpers';

type FeatureEmailSentLog = {
  from?: string | null;
  to?: string[] | null;
  subject?: string | null;
  sentAt?: string | null;
};

interface FeatureEmailSentBadgeProps {
  sentAt?: string | null;
  log?: FeatureEmailSentLog | null;
}

export function FeatureEmailSentBadge({ sentAt, log }: FeatureEmailSentBadgeProps) {
  const effectiveSentAt = sentAt ?? log?.sentAt ?? null;
  if (!effectiveSentAt) return null;

  const formattedSentAt = formatDateTime(effectiveSentAt);
  const recipients = log?.to?.filter(Boolean).join(', ');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="success" appearance="light" size="sm">
          Email sent
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-80">
        <div className="space-y-1">
          <div>Sent {formattedSentAt}</div>
          {recipients && <div className="truncate">To: {recipients}</div>}
          {log?.subject && <div className="truncate">Subject: {log.subject}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
