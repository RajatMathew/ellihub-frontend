import type { UseQueryResult } from '@tanstack/react-query';

import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import type { CostCodeCategory } from '@/modules/catalog/schemas/costcode-category.schema';
import type { CostCode } from '@/modules/catalog/schemas/costcode.schema';

interface CostCodesStatsBarProps {
  totalCount: number;
  categories: CostCodeCategory[];
  categoryCountQueries: UseQueryResult<{ data: CostCode[]; count: number }>[];
  className?: string;
}

export function CostCodesStatsBar({
  totalCount,
  categories,
  categoryCountQueries,
  className,
}: CostCodesStatsBarProps) {
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
