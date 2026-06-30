import { ListStatsCards, type ListStatCardItem } from '@/app/components/ui/list-stats-cards';
import type { CostCodeStats } from '@/modules/catalog/schemas/costcode.schema';

interface CostCodesStatsBarProps {
  stats?: CostCodeStats;
  isLoading?: boolean;
  className?: string;
}

export function CostCodesStatsBar({ stats, isLoading, className }: CostCodesStatsBarProps) {
  const items: ListStatCardItem[] = [
    {
      label: 'Total Cost Codes',
      value: stats?.totalCostCodes ?? 0,
      description: 'Master list',
      dotColor: 'bg-muted-foreground/40',
    },
    ...(stats?.categories ?? []).slice(0, 4).map((category) => ({
      label: category.name,
      value: category.count,
      description: category.description ?? 'Category',
      dotColor: 'bg-primary',
    })),
  ];

  return (
    <ListStatsCards
      items={items}
      isLoading={isLoading}
      skeletonCount={5}
      columns={{ md: 3, xl: 5 }}
      className={className}
    />
  );
}
