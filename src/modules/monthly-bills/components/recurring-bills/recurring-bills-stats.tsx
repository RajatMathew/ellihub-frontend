import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import { formatCurrency } from '@/app/lib/helpers';
import type { RecurringBillsSummary } from '@/modules/monthly-bills/schemas/recurring-bills.schema';

interface RecurringBillsStatsProps {
  summary: RecurringBillsSummary;
}

export function RecurringBillsStats({ summary }: RecurringBillsStatsProps) {
  return (
    <ListStatsCards
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Active',
          value: summary.activeCount,
          description: `${summary.scheduledCount} scheduled this month`,
          dotColor: 'bg-success',
        },
        {
          label: 'Paused',
          value: summary.pausedCount,
          description: 'Not included in payments',
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Planned',
          value: formatCurrency(summary.plannedAmount),
          description: 'Expected this month',
          dotColor: 'bg-info',
        },
        {
          label: 'Paid This Month',
          value: formatCurrency(summary.paidAmount),
          description: `${summary.paidCount} recorded`,
          dotColor: 'bg-success',
        },
      ]}
    />
  );
}