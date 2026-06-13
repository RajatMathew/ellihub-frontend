import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import { formatCurrency } from '@/app/lib/helpers';
import type { InvoiceStats } from '@/modules/project/schemas/invoice';

interface InvoiceListStatsProps {
  stats?: InvoiceStats;
  isLoading?: boolean;
}

export function InvoiceListStats({ stats, isLoading }: InvoiceListStatsProps) {
  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={4}
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Total Invoices',
          value: stats?.totalInvoices ?? 0,
          description: formatCurrency(stats?.totalAmount ?? 0),
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Unpaid',
          value: stats?.unpaidInvoices ?? 0,
          description: formatCurrency(stats?.unpaidAmount ?? 0),
          dotColor: 'bg-warning',
        },
        {
          label: 'Paid',
          value: stats?.paidInvoices ?? 0,
          description: formatCurrency(stats?.paidAmount ?? 0),
          dotColor: 'bg-success',
        },
        {
          label: 'Disputed / Overdue',
          value: (stats?.disputedInvoices ?? 0) + (stats?.overdueInvoices ?? 0),
          description: 'Needs attention',
          dotColor: 'bg-destructive',
        },
      ]}
    />
  );
}
