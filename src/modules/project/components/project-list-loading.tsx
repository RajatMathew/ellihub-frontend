import { Skeleton } from '@/app/components/ui/skeleton';
import type { ProjectPortfolioView } from '@/modules/project/components/project-view-switcher';

interface ProjectListLoadingProps {
  viewMode?: ProjectPortfolioView;
}

export function ProjectListLoading({ viewMode = 'board' }: ProjectListLoadingProps) {
  return (
    <div className="space-y-5">
      <div className="w-fit max-w-full rounded-2xl border border-card-border bg-muted/50 p-1.5 shadow-xs shadow-black/5">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`project-status-loader-${index}`}
              className="min-h-[92px] rounded-xl border border-card-border bg-card p-3 shadow-xs shadow-black/5 sm:min-w-[280px]"
            >
              <div className="flex h-full flex-col justify-between gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Skeleton className="size-2.5 shrink-0 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {viewMode === 'list' ? <ProjectListTableSkeleton /> : <ProjectBoardSkeleton />}
    </div>
  );
}

function ProjectBoardSkeleton() {
  return (
    <div className="-mx-4 overflow-x-auto px-4 lg:-mx-7.5 lg:px-7.5">
      <div
        className="grid min-w-[1120px] gap-x-5 gap-y-3"
        style={{ gridTemplateColumns: 'repeat(4, minmax(260px, 1fr))' }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`project-division-header-loader-${index}`}
            className="flex min-w-0 flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-3 rounded-sm bg-card-header px-3 py-2">
              <Skeleton className="h-3 w-24 bg-card-header-foreground/30" />
              <Skeleton className="h-3 w-8 bg-card-header-foreground/30" />
            </div>
          </div>
        ))}

        {Array.from({ length: 8 }).map((_, index) => (
          <ProjectCardSkeleton key={`project-card-loader-${index}`} />
        ))}
      </div>
    </div>
  );
}

function ProjectListTableSkeleton() {
  return (
    <div className="min-w-0">
      <div className="grid gap-2.5 lg:hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`project-mobile-list-loader-${index}`}
            className="rounded-md border border-card-border bg-card p-3 shadow-xs shadow-black/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-md" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Skeleton className="h-1.5 flex-1 rounded-none" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden min-w-0 overflow-hidden rounded-lg border border-card-border bg-card shadow-xs shadow-black/5 lg:block">
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[minmax(230px,1.45fr)_minmax(170px,0.85fr)_minmax(190px,1fr)_minmax(175px,0.85fr)_minmax(190px,1fr)_minmax(130px,0.65fr)] border-b bg-muted/40 px-4 py-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={`project-list-header-loader-${index}`} className="h-3 w-20" />
              ))}
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={`project-list-row-loader-${index}`}
                  className="grid grid-cols-[minmax(230px,1.45fr)_minmax(170px,0.85fr)_minmax(190px,1fr)_minmax(175px,0.85fr)_minmax(190px,1fr)_minmax(130px,0.65fr)] px-4 py-3"
                >
                  <div className="space-y-2 pr-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <div className="space-y-2 pr-4">
                    <Skeleton className="h-6 w-24 rounded-md" />
                    <Skeleton className="h-6 w-20 rounded-md" />
                  </div>
                  <div className="space-y-2 pr-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="space-y-2 pr-4">
                    <Skeleton className="ml-auto h-4 w-24" />
                    <Skeleton className="ml-auto h-3 w-20" />
                  </div>
                  <div className="space-y-2 pr-4">
                    <div className="flex justify-between gap-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border border-card-border bg-card p-3.5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="ml-auto h-3 w-14" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="h-1.5 flex-1 rounded-none" />
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Skeleton className="h-px w-14 rounded-none" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-px w-14 rounded-none" />
      </div>
    </div>
  );
}
