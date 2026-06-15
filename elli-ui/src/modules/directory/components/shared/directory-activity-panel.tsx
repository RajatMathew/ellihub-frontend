import { ActivityPanel } from '@/app/components/activity-panel';
import type { DirectoryActivityItem } from '@/modules/directory/components/shared/directory-activity.types';

interface DirectoryActivityPanelProps {
  items: DirectoryActivityItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function DirectoryActivityPanel({
  items,
  isLoading,
  isError,
  onRetry,
}: DirectoryActivityPanelProps) {
  return <ActivityPanel items={items} isLoading={isLoading} isError={isError} onRetry={onRetry} />;
}
