import { ToolbarSkeleton } from '@/app/components/toolbar/toolbar-skeleton';
import { Skeleton } from '@/app/components/ui/skeleton';

export function ProjectOverviewLoading() {
  return (
    <div className="container-fluid py-7.5">
      <div className="space-y-4">
        <ToolbarSkeleton className="bg-white dark:bg-background" actionCount={3} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-lg" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-lg" />
          ))}
        </div>

        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}
