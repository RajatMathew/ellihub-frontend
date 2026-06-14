import { Skeleton } from '@/app/components/ui/skeleton';

interface ProjectDetailPageLoadingProps {
  statsCount?: number;
  sidebarCards?: number;
}

interface ProjectFormPageLoadingProps {
  sections?: number;
}

export function ProjectDetailPageLoading({
  statsCount = 4,
  sidebarCards = 2,
}: ProjectDetailPageLoadingProps) {
  return (
    <div className="container-fluid max-w-full overflow-x-hidden px-4 pb-5 sm:px-6 lg:px-7.5">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-full max-w-80" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: statsCount }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-lg" />
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="min-w-0 space-y-5 xl:col-span-2">
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-56 rounded-lg" />
          </div>
          <div className="min-w-0 space-y-5">
            {Array.from({ length: sidebarCards }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectFormPageLoading({ sections = 3 }: ProjectFormPageLoadingProps) {
  return (
    <div className="container-fluid max-w-full overflow-x-hidden px-4 pb-5 sm:px-6 lg:px-7.5">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-full max-w-72" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <aside className="hidden space-y-2 lg:block">
            {Array.from({ length: sections }).map((_, index) => (
              <Skeleton key={index} className="h-10 rounded-md" />
            ))}
          </aside>
          <div className="space-y-5 lg:col-span-3">
            {Array.from({ length: sections }).map((_, index) => (
              <Skeleton key={index} className="h-56 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
