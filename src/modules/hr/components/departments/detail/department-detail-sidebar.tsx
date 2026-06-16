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
              <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Created On
                </span>
                <span className="break-words text-sm font-semibold text-foreground sm:text-right">
                  {department.createdAt ? new Date(department.createdAt).toLocaleDateString() : '-'}
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Department ID
                </span>
                <span className="break-words text-xs font-mono text-muted-foreground sm:text-right">
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
