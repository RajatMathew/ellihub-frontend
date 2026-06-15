import { useMemo } from 'react';

import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import { formatCurrency } from '@/app/lib/helpers';
import { getMonthPayments, sumPayments } from '@/modules/monthly-bills/lib/monthly-bills-bill';
import { sumMonthlyBillMoney } from '@/modules/monthly-bills/lib/monthly-bills-money';
import type { MonthlyBillProjectGroup } from '@/modules/monthly-bills/schemas/monthly-bills.schema';

interface MonthlyBillsStatsProps {
  groups: MonthlyBillProjectGroup[];
  selectedDate: Date;
  isLoading?: boolean;
}

export function MonthlyBillsStats({ groups, selectedDate, isLoading }: MonthlyBillsStatsProps) {
  const stats = useMemo(() => {
    const bills = groups.flatMap((group) => group.bills);

    return {
      projectCount: groups.length,
      billCount: bills.length,
      balance: sumMonthlyBillMoney(bills.map((bill) => bill.balance)),
      planned: sumMonthlyBillMoney(bills.map((bill) => bill.plannedPayment?.amount)),
      paidThisMonth: sumMonthlyBillMoney(
        bills.map((bill) => sumPayments(getMonthPayments(bill, selectedDate)))
      ),
      readyCount: bills.filter((bill) => bill.plannedPayment?.isReady).length,
    };
  }, [groups, selectedDate]);

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
