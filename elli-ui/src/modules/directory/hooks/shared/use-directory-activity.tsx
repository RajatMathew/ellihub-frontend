import { useActivityPanelItems } from '@/app/hooks/use-activity-log';

export function useDirectoryActivity(entityType: string, entityId: string | undefined) {
  return useActivityPanelItems(entityType, entityId);
}
