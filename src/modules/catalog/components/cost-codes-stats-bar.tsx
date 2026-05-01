import type { UseQueryResult } from '@tanstack/react-query';

import { Skeleton } from '@/app/components/ui/skeleton';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import type { CostCode } from '@/modules/catalog/schemas/costcode.schema';

interface CostCodesStatsBarProps {
  totalCount: number;
  categories: CostCodeCategory[];
  categoryCountQueries: UseQueryResult<{ data: CostCode[]; count: number }>[];
  isLoading?: boolean;
  className?: string;
}

function CostCodesStatsSkeletonItem() {
  return (
    <div className="flex flex-col gap-y-2 border-r border-separator bg-transparent px-4 py-2.5 last:border-r-0">
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
      <StatsBar columns={4} className={className}>
        {Array.from({ length: 4 }).map((_, index) => (
          <CostCodesStatsSkeletonItem key={index} />
        ))}
      </StatsBar>
    );
  }

  return (
    <StatsBar columns={4} className={className}>
      <StatsBarItem
        label="Total Cost Codes"
        value={totalCount.toString()}
        description="Master list"
        dotColor="bg-muted-foreground/40"
        valueColor="text-foreground"
      />
      {categories.slice(0, 3).map((cat, i) => (
        <StatsBarItem
          key={cat.id}
          label={cat.name}
          value={(categoryCountQueries[i]?.data?.count ?? 0).toString()}
          description={cat.description ?? 'Category'}
          dotColor="bg-primary"
          valueColor="text-foreground"
        />
      ))}
    </StatsBar>
  );
}
