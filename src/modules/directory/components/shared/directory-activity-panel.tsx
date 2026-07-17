import { ActivityPanel, type ActivityPanelProps } from '@/app/components/activity-panel';

export type DirectoryActivityPanelProps = ActivityPanelProps;

export function DirectoryActivityPanel(props: DirectoryActivityPanelProps) {
  return <ActivityPanel {...props} />;
}
