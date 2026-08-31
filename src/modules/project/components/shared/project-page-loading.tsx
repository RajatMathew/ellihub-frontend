import { PageHeaderSkeleton } from '@/app/components/page-header';
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
    <div className="container-fluid max-w-full overflow-x-clip pb-5">
      <PageHeaderSkeleton actionCount={2} showEyebrow />

      <div className="space-y-5 pt-5">
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
    <div className="container-fluid max-w-full overflow-x-clip pb-5">
      <PageHeaderSkeleton actionCount={2} showEyebrow />

      <div className="space-y-5 pt-5">
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
