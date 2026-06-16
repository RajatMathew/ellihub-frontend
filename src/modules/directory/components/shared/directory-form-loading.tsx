import { formPageContainerClassName } from '@/app/components/form-page-layout';
import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function DirectoryFormLoading() {
  return (
    <div className={formPageContainerClassName}>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="space-y-6 pt-6">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={`directory-form-loader-${index}`}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
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
