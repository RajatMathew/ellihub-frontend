import {
  formPageContainerClassName,
  unifiedFormHeaderClassName,
  unifiedSingleSectionFormToolbarClassName,
} from '@/app/components/form-page-layout';
import { ToolbarSkeleton } from '@/app/components/toolbar/toolbar-skeleton';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function DepartmentFormLoading() {
  return (
    <div className={formPageContainerClassName}>
      <div className={unifiedFormHeaderClassName}>
        <ToolbarSkeleton
          sticky={false}
          className={unifiedSingleSectionFormToolbarClassName}
          actionCount={2}
        />
      </div>

      <div className="space-y-6 pt-4 pb-8 lg:pb-10">
        <Card>
          <CardContent className="space-y-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
