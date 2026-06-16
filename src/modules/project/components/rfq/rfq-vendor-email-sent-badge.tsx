import { Badge } from '@/app/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { formatDateTime } from '@/app/lib/helpers';

interface RFQVendorEmailSentBadgeProps {
  sentAt?: string | null;
}

export function RFQVendorEmailSentBadge({ sentAt }: RFQVendorEmailSentBadgeProps) {
  if (!sentAt) return null;

  const formattedSentAt = formatDateTime(sentAt);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="success" appearance="light" size="sm">
          Email sent
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">Sent {formattedSentAt}</TooltipContent>
    </Tooltip>
  );
}
