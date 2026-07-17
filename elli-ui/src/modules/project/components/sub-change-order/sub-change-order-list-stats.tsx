import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import { formatCurrency } from '@/app/lib/helpers';
import type { SCOStats } from '@/modules/project/schemas/sub-change-order';

interface SubChangeOrderListStatsProps {
  stats?: SCOStats;
  isLoading?: boolean;
}

export function SubChangeOrderListStats({ stats, isLoading }: SubChangeOrderListStatsProps) {
  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={4}
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Total SCOs',
          value: stats?.totalSubChangeOrders ?? 0,
          description: 'Project changes',
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Approved',
          value: stats?.approvedSubChangeOrders ?? 0,
          description: formatCurrency(stats?.approvedAmount ?? 0),
          dotColor: 'bg-success',
        },
        {
          label: 'Draft',
          value: stats?.draftSubChangeOrders ?? 0,
          description: formatCurrency(stats?.pendingAmount ?? 0),
          dotColor: 'bg-primary',
        },
        {
          label: 'Rejected / Void',
          value: (stats?.rejectedSubChangeOrders ?? 0) + (stats?.voidSubChangeOrders ?? 0),
          description: 'Closed changes',
          dotColor: 'bg-warning',
        },
      ]}
    />
  );
}
