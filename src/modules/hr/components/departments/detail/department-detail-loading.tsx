import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function DepartmentDetailLoading() {
  return (
    <div className="container-fluid max-w-full space-y-6 overflow-x-hidden pb-5">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
        <Card className="min-w-0 flex-1">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={`department-team-loader-${index}`} className="h-32 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="w-full lg:w-72 xl:w-80">
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
