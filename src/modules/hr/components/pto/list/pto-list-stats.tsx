import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import type { PTOStats } from '@/modules/hr/schemas/pto.schema';

interface PTOListStatsProps {
  stats?: PTOStats;
  isLoading?: boolean;
}

export function PTOListStats({ stats, isLoading }: PTOListStatsProps) {
  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={4}
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Total Requests',
          value: stats?.totalRequests ?? 0,
          description: 'Accessible leave',
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Pending',
          value: stats?.pendingRequests ?? 0,
          description: 'Awaiting review',
          dotColor: 'bg-warning',
        },
        {
          label: 'Approved',
          value: stats?.approvedRequests ?? 0,
          description: 'Accepted requests',
          dotColor: 'bg-success',
        },
        {
          label: 'Upcoming',
          value: stats?.upcomingApprovedRequests ?? 0,
          description: 'Approved future leave',
          dotColor: 'bg-primary',
        },
      ]}
    />
  );
}
