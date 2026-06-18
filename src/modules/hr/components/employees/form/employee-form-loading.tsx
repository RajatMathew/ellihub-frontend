import {
  formPageContainerClassName,
  unifiedFormHeaderClassName,
  unifiedSingleSectionFormToolbarClassName,
} from '@/app/components/form-page-layout';
import { ToolbarSkeleton } from '@/app/components/toolbar/toolbar-skeleton';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function EmployeeFormLoading() {
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
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={`employee-form-loader-${index}`}>
            <CardContent className="space-y-6">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-px w-full" />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Skeleton className="h-18 w-full" />
                <Skeleton className="h-18 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
