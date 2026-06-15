import { Card, CardContent, CardHeader } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function ContactDetailLoading() {
  return (
    <div className="container-fluid max-w-full overflow-x-hidden pb-5">
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="flex min-w-0 flex-col gap-6 pt-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Card key={`contact-stat-loader-${index}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <Skeleton className="size-12 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
            {Array.from({ length: 2 }, (_, index) => (
              <Card key={`contact-card-loader-${index}`}>
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-10 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="w-full lg:w-72 xl:w-80">
          <CardHeader>
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
