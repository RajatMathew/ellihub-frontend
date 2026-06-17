import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function EmployeeDetailLoading() {
  return (
    <div className="container-fluid max-w-full overflow-x-hidden pb-5">
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <Card key={`employee-detail-loader-${index}`}>
                <CardHeader>
                  <Skeleton className="h-4 w-36" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="w-full lg:w-72 xl:w-80">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
