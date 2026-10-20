import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/app/lib/utils';

interface ActivityRevisionBadgeProps {
  revision?: number | null;
  className?: string;
}

export function ActivityRevisionBadge({ revision, className }: ActivityRevisionBadgeProps) {
  if (!revision) return null;

  return (
    <Badge
      variant="primary"
      appearance="light"
      size="sm"
      className={cn('shrink-0 border border-primary/15 font-semibold normal-case', className)}
    >
      rev {revision}
    </Badge>
  );
}
