import { Skeleton } from '@/app/components/ui/skeleton';

export function ProjectListLoading() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
