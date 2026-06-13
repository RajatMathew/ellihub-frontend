import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function PTODetailLoading() {
  return (
    <div className="container-fluid max-w-full space-y-6 overflow-x-hidden pb-5">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72 max-w-full" />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="min-w-0 lg:col-span-3">
          <CardContent className="space-y-6 pt-6">
            <Skeleton className="h-6 w-44" />
            <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 2xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={`pto-detail-field-${index}`} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-28 w-full rounded-lg" />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
