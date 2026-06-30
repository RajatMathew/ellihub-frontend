import { ActivityPanel } from '@/app/components/activity-panel';
import { useActivityPanelItems } from '@/app/hooks/use-activity-log';

type ProjectActivityEntityType =
  | 'project'
  | 'rfq'
  | 'purchaseOrder'
  | 'primeChangeOrder'
  | 'subChangeOrder'
  | 'invoice';

interface ProjectActivityPanelProps {
  entityType: ProjectActivityEntityType;
  entityId: string | undefined;
  entityName?: string;
  emptyMessage?: string;
  enabled?: boolean;
  size?: number;
}

export function ProjectActivityPanel({
  entityType,
  entityId,
  entityName,
  emptyMessage,
  enabled,
  size,
}: ProjectActivityPanelProps) {
  const activity = useActivityPanelItems(entityType, entityId, { entityName, enabled, size });

  return (
    <ActivityPanel
      items={activity.items}
      isLoading={activity.isLoading}
      isError={activity.isError}
      onRetry={() => void activity.refetch()}
      emptyMessage={emptyMessage}
      {...activity.commentControls}
    />
  );
}
