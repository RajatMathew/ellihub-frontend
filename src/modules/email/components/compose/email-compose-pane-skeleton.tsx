import { Skeleton } from '@/app/components/ui/skeleton';

/**
 * Shown while the composer chunk loads. It is a separate, eagerly imported
 * module so the Suspense fallback is not itself part of the lazy chunk.
 */
export function EmailComposePaneSkeleton() {
  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
      role="status"
      aria-label="Opening the composer"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-4 px-5 py-5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
