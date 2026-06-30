import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import { formatCurrency } from '@/app/lib/helpers';

interface GCStatsCardsProps {
  activeProjects: number;
  isLoading?: boolean;
  totalCommitted: number;
  totalGCs: number;
}

export function GCStatsCards({
  activeProjects,
  isLoading,
  totalCommitted,
  totalGCs,
}: GCStatsCardsProps) {
  const statsItems = [
    {
      label: 'Total GCs',
      value: totalGCs,
      description: 'Approved partners',
      dotColor: 'bg-primary',
    },
    {
      label: 'Active Projects',
      value: activeProjects,
      description: 'Current workload',
      dotColor: 'bg-info',
    },
    {
      label: 'Total Committed',
      value: formatCurrency(totalCommitted),
      description: 'Portfolio value',
      dotColor: 'bg-success',
    },
    {
      label: 'Compliance Alert',
      value: 0,
      description: 'Action required',
      dotColor: 'bg-destructive',
    },
  ];

  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={4}
      columns={{ sm: 2, lg: 4 }}
      items={statsItems}
    />
  );
}
