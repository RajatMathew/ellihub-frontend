import type { ComponentProps } from 'react';

import { Skeleton } from '@/app/components/ui/skeleton';
import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';

type StatsBarColumns = ComponentProps<typeof StatsBar>['columns'];

export interface ListStatCardItem {
  label: string;
  value: string | number;
  description?: string;
  dotColor?: string;
  valueColor?: string;
  active?: boolean;
  onClick?: () => void;
}

interface ListStatsCardsProps {
  items: ListStatCardItem[];
  isLoading?: boolean;
  skeletonCount?: number;
  columns?: StatsBarColumns;
  className?: string;
}

function ListStatsCardsSkeletonItem() {
  return (
    <div className="flex min-h-[104px] flex-col justify-between gap-y-2 rounded-xl border border-border bg-card px-4 py-3 shadow-xs shadow-black/5">
      <div className="flex items-center gap-x-1.5">
        <Skeleton className="size-1.5 rounded-full" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function ListStatsCards({
  items,
  isLoading,
  skeletonCount,
  columns,
  className = 'mb-5 lg:mb-7.5',
}: ListStatsCardsProps) {
  if (isLoading) {
    return (
      <StatsBar variant="cards" width="full" columns={columns} className={className}>
        {Array.from({ length: skeletonCount ?? Math.max(items.length, 4) }, (_, index) => (
          <ListStatsCardsSkeletonItem key={`list-stat-loader-${index}`} />
        ))}
      </StatsBar>
    );
  }

  return (
    <StatsBar variant="cards" width="full" columns={columns} className={className}>
      {items.map((item) => (
        <StatsBarItem
          key={item.label}
          variant="card"
          label={item.label}
          value={item.value}
          description={item.description}
          dotColor={item.dotColor ?? 'bg-primary'}
          valueColor={item.valueColor ?? 'text-foreground'}
          valueSize="medium"
          active={item.active}
          onClick={item.onClick}
        />
      ))}
    </StatsBar>
  );
}
