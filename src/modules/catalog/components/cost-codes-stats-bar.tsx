import { Skeleton } from '@/app/components/ui/skeleton';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import type { UseQueryResult } from '@tanstack/react-query';

interface CostCodesStatsBarProps {
  totalCount: number;
  categories: CostCodeCategory[];
  categoryCountQueries: UseQueryResult<number>[];
  isLoading?: boolean;
  className?: string;
}

function CostCodesStatsSkeletonItem() {
  return (
    <div className="flex min-h-[104px] flex-col justify-between gap-y-2 rounded-xl border border-border bg-card px-4 py-3 shadow-xs shadow-black/5">
      <div className="flex items-center gap-x-1.5">
        <Skeleton className="size-1.5 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-7 w-14" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function CostCodesStatsBar({
  totalCount,
  categories,
  categoryCountQueries,
  isLoading,
  className,
}: CostCodesStatsBarProps) {
  if (isLoading) {
    return (
      <StatsBar variant="cards" width="full" columns={{ md: 3, xl: 5 }} className={className}>
        {Array.from({ length: 5 }).map((_, index) => (
          <CostCodesStatsSkeletonItem key={index} />
        ))}
      </StatsBar>
    );
  }

  return (
    <StatsBar variant="cards" width="full" columns={{ md: 3, xl: 5 }} className={className}>
      <StatsBarItem
        variant="card"
        label="Total Cost Codes"
        value={totalCount.toString()}
        description="Master list"
        dotColor="bg-muted-foreground/40"
        valueColor="text-foreground"
        valueSize="medium"
      />
      {categories.slice(0, 4).map((cat, i) => (
        <StatsBarItem
          variant="card"
          key={cat.id}
          label={cat.name}
          value={(categoryCountQueries[i]?.data ?? 0).toString()}
          description={cat.description ?? 'Category'}
          dotColor="bg-primary"
          valueColor="text-foreground"
          valueSize="medium"
        />
      ))}
    </StatsBar>
  );
}
