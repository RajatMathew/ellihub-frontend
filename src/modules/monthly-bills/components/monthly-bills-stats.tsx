import { useMemo } from 'react';

import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import { formatCurrency } from '@/app/lib/helpers';
import { getMonthPayments, sumPayments } from '@/modules/monthly-bills/lib/monthly-bills-bill';
import type { MonthlyBillProjectGroup } from '@/modules/monthly-bills/schemas/monthly-bills.schema';

interface MonthlyBillsStatsProps {
  groups: MonthlyBillProjectGroup[];
  selectedDate: Date;
  isLoading?: boolean;
}

export function MonthlyBillsStats({ groups, selectedDate, isLoading }: MonthlyBillsStatsProps) {
  const stats = useMemo(
    () =>
      groups.reduce(
        (acc, group) => {
          acc.projectCount += 1;
          acc.billCount += group.bills.length;

          for (const bill of group.bills) {
            acc.balance += bill.balance;
            acc.planned += bill.plannedPayment?.amount ?? 0;
            acc.paidThisMonth += sumPayments(getMonthPayments(bill, selectedDate));
            if (bill.plannedPayment?.isReady) acc.readyCount += 1;
          }

          return acc;
        },
        {
          projectCount: 0,
          billCount: 0,
          balance: 0,
          planned: 0,
          paidThisMonth: 0,
          readyCount: 0,
        }
      ),
    [groups, selectedDate]
  );

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
