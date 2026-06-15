import { Card, CardContent } from '@/app/components/ui/card';
import { Skeleton } from '@/app/components/ui/skeleton';

export function FilesGridLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <Card key={`files-grid-loader-${index}`}>
          <CardContent className="flex flex-col items-center gap-3 p-5">
            <Skeleton className="size-16 rounded-lg" />
            <Skeleton className="h-4 w-full max-w-40" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="size-7 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
