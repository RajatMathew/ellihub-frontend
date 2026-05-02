import { ActivityPanel } from '@/app/components/activity-panel';
import type { ActivityPanelItem } from '@/app/components/activity-panel';
import { DetailSidebar } from '@/app/components/detail-sidebar';
import { Card, CardContent } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import type { DepartmentDetail } from '@/modules/hr/schemas/department.schema';

interface DepartmentDetailSidebarProps {
  department: DepartmentDetail;
  open: boolean;
  activityItems: ActivityPanelItem[];
  isActivityLoading: boolean;
  isActivityError: boolean;
  onActivityRetry: () => void;
  onClose: () => void;
}

export function DepartmentDetailSidebar({
  department,
  open,
  activityItems,
  isActivityLoading,
  isActivityError,
  onActivityRetry,
  onClose,
}: DepartmentDetailSidebarProps) {
  return (
    <DetailSidebar
      open={open}
      onClose={onClose}
      activityChildren={
        <ActivityPanel
          items={activityItems}
          isLoading={isActivityLoading}
          isError={isActivityError}
          onRetry={onActivityRetry}
        />
      }
    >
      <div className="space-y-6 pt-2">
        <div>
          <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Department Info
          </div>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <span className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
                  Description
                </span>
                <p className="break-words text-sm leading-relaxed text-foreground">
                  {department.description || 'No description provided for this department.'}
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Created On
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {department.createdAt ? new Date(department.createdAt).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Department ID
                </span>
                <span className="truncate text-xs font-mono text-muted-foreground">
                  {department.id.slice(-8).toUpperCase()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DetailSidebar>
  );
}
