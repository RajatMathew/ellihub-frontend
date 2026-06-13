import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import type { RFQStats } from '@/modules/project/schemas/rfq';

interface RFQListStatsProps {
  stats?: RFQStats;
  isLoading?: boolean;
}

export function RFQListStats({ stats, isLoading }: RFQListStatsProps) {
  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={3}
      columns={{ sm: 2, lg: 3 }}
      items={[
        {
          label: 'Total RFQs',
          value: stats?.totalRfqs ?? 0,
          description: 'Project RFQs',
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Active',
          value: stats?.activeRfqs ?? 0,
          description: 'Published',
          dotColor: 'bg-primary',
        },
        {
          label: 'Awarded',
          value: stats?.awardedRfqs ?? 0,
          description: 'Converted or ready',
          dotColor: 'bg-success',
        },
      ]}
    />
  );
}
