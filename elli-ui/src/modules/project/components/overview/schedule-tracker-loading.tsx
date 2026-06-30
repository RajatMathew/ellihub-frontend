import { ProjectInlineListLoading } from '@/modules/project/components/shared';

export function ScheduleTrackerLoading() {
  return (
    <div className="p-5">
      <ProjectInlineListLoading rows={2} rowClassName="h-8" />
    </div>
  );
}
