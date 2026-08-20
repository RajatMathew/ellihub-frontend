import { Badge } from '@/app/components/ui/badge';
import {
  getActivityActionMeta,
  getActivityEntityLabel,
} from '@/modules/activity-log/constants/activity-log.constants';
import { Search } from 'lucide-react';

export function ActivityActionBadge({ action }: { action: string }) {
  const meta = getActivityActionMeta(action);
  return (
    <Badge variant={meta.variant} appearance="light" size="sm">
      {meta.label}
    </Badge>
  );
}

export function ActivityEntityBadge({ entityType }: { entityType: string }) {
  return (
    <Badge variant="outline" size="sm">
      {getActivityEntityLabel(entityType)}
    </Badge>
  );
}

export function ActivityEmptyIcon() {
  return (
    <div className="flex size-10 items-center justify-center rounded-md border bg-muted/30">
      <Search className="size-5 text-muted-foreground/60" />
    </div>
  );
}
