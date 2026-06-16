import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import { formatCurrency } from '@/app/lib/helpers';
import type { POStats } from '@/modules/project/schemas/purchase-order';

interface PurchaseOrderListStatsProps {
  stats?: POStats;
  isLoading?: boolean;
}

export function PurchaseOrderListStats({ stats, isLoading }: PurchaseOrderListStatsProps) {
  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={4}
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Total POs',
          value: stats?.totalPurchaseOrders ?? 0,
          description: 'Project purchase orders',
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Committed',
          value: formatCurrency(stats?.totalCommitted ?? 0),
          description: 'Issued and delivered',
          dotColor: 'bg-success',
        },
        {
          label: 'Issued',
          value: stats?.issuedPurchaseOrders ?? 0,
          description: 'Awaiting delivery',
          dotColor: 'bg-primary',
        },
        {
          label: 'Delivered',
          value: stats?.deliveredPurchaseOrders ?? 0,
          description: 'Received orders',
          dotColor: 'bg-info',
        },
      ]}
    />
  );
}
