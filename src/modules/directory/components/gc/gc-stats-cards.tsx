import { StatsBar, StatsBarItem } from '@/app/components/ui/stats-bar';
import { formatCurrency } from '@/app/lib/helpers';

interface GCStatsCardsProps {
  activeProjects: number;
  totalCommitted: number;
  totalGCs: number;
}

export function GCStatsCards({ activeProjects, totalCommitted, totalGCs }: GCStatsCardsProps) {
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
    <StatsBar variant="cards" width="full" columns={{ sm: 2, lg: 4 }} className="mb-5 lg:mb-7.5">
      {statsItems.map((item) => (
        <StatsBarItem
          key={item.label}
          variant="card"
          label={item.label}
          value={item.value}
          description={item.description}
          dotColor={item.dotColor}
          valueColor="text-foreground"
          valueSize="medium"
        />
      ))}
    </StatsBar>
  );
}
