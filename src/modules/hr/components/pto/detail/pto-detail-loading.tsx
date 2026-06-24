import { ToolbarSkeleton } from '@/app/components/toolbar/toolbar-skeleton';
import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function PTODetailLoading() {
  return (
    <div className="container-fluid max-w-full overflow-x-clip pb-5">
      <ToolbarSkeleton showSubtitle actionCount={2} />

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex border-b border-rule-strong">
            <Skeleton className="mb-2 h-5 w-20" />
            <Skeleton className="mb-2 ml-8 h-5 w-20" />
          </div>

          <Card className="min-w-0">
            <CardHeader>
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={`pto-detail-field-${index}`} className="h-28 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-32 w-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        <Card className="w-full lg:w-72 xl:w-80">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-36 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
