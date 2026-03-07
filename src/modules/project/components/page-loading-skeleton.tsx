interface PageLoadingSkeletonProps {
  statsCount?: number;
  cardsCount?: number;
}

export function PageLoadingSkeleton({ statsCount = 4, cardsCount = 0 }: PageLoadingSkeletonProps) {
  return (
    <div className="container-fluid py-7.5">
      <div className="space-y-6">
        <div className="h-20 bg-muted rounded-xl animate-pulse" />
        {statsCount > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: statsCount }, (_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        )}
        {cardsCount > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: cardsCount }, (_, i) => (
              <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
