import type { ActivityLogItem } from '@/app/api/activity-log.api';
import { ActivityChangeDetailsButton } from '@/app/components/activity-change-details-dialog';
import {
  ActivityRevisionBadge,
  stripActivityRevisionSuffix,
} from '@/app/components/activity-revision-badge';
import { Badge } from '@/app/components/ui/badge';
import {
  getActivityActionMeta,
  getActivityEntityLabel,
} from '@/modules/activity-log/constants/activity-log.constants';
import { formatActivityDate } from '@/modules/activity-log/lib/activity-log-utils';

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

export function ActivityLogDescriptionCell({ log }: { log: ActivityLogItem }) {
  const { date, time } = formatActivityDate(log.createdAt);
  const displayDescription = stripActivityRevisionSuffix(log.description, log.revision);

  return (
    <div className="max-w-xl">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium">
        <span className="min-w-0 break-words">{displayDescription}</span>
        <ActivityRevisionBadge revision={log.revision} />
      </div>
      {log.note && (
        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{log.note}</div>
      )}
      {log.details && (
        <ActivityChangeDetailsButton
          details={log.details}
          summary={displayDescription}
          actor={log.user?.name ?? 'System'}
          timestamp={`${date} ${time}`}
          className="mt-1 px-0 hover:bg-transparent"
        />
      )}
    </div>
  );
}
