import { Skeleton } from '@/app/components/ui/skeleton';

export function ProjectOverviewLoading() {
  return (
    <div className="container-fluid py-7.5">
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-full max-w-96" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-20 rounded-sm" />
                <Skeleton className="h-5 w-28 rounded-sm" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
          </div>
        </div>

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
