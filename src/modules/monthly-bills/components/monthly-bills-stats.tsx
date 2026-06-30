import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import { formatCurrency } from '@/app/lib/helpers';
import type { MonthlyBillsSummary } from '@/modules/monthly-bills/schemas/monthly-bills.schema';

interface MonthlyBillsStatsProps {
  summary?: MonthlyBillsSummary;
  isLoading?: boolean;
}

const EMPTY_SUMMARY: MonthlyBillsSummary = {
  projectCount: 0,
  billCount: 0,
  balance: 0,
  planned: 0,
  paidThisMonth: 0,
  readyCount: 0,
};

export function MonthlyBillsStats({ summary, isLoading }: MonthlyBillsStatsProps) {
  const stats = summary ?? EMPTY_SUMMARY;

  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={4}
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Open POs',
          value: stats.billCount,
          description: `${stats.projectCount} project${stats.projectCount === 1 ? '' : 's'}`,
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Balance',
          value: formatCurrency(stats.balance),
          description: 'Outstanding',
          dotColor: 'bg-warning',
        },
        {
          label: 'Planned',
          value: formatCurrency(stats.planned),
          description: `${stats.readyCount} ready`,
          dotColor: 'bg-info',
        },
        {
          label: 'Paid This Month',
          value: formatCurrency(stats.paidThisMonth),
          description: 'Recorded payments',
          dotColor: 'bg-success',
        },
      ]}
    />
  );
}
