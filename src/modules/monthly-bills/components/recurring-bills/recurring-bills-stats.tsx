import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import { formatCurrency } from '@/app/lib/helpers';
import type { RecurringBillRule } from '@/modules/monthly-bills/types/recurring-bills.types';

interface RecurringBillsStatsProps {
  rules: RecurringBillRule[];
  selectedDate: Date;
}

export function RecurringBillsStats({ rules, selectedDate }: RecurringBillsStatsProps) {
  const activeRules = rules.filter((rule) => rule.isActive);
  const pausedRules = rules.filter((rule) => !rule.isActive);
  const scheduledCount = activeRules.reduce(
    (total, rule) => total + getOccurrencesInMonth(rule, selectedDate),
    0
  );
  const plannedAmount = activeRules.reduce(
    (total, rule) => total + rule.defaultAmount * getOccurrencesInMonth(rule, selectedDate),
    0
  );
  const paidRules = rules.filter((rule) => (rule.lastPaidAmount ?? 0) > 0);
  const paidAmount = paidRules.reduce((total, rule) => total + (rule.lastPaidAmount ?? 0), 0);

  return (
    <ListStatsCards
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Active',
          value: activeRules.length,
          description: `${scheduledCount} scheduled this month`,
          dotColor: 'bg-success',
        },
        {
          label: 'Paused',
          value: pausedRules.length,
          description: 'Not included in payments',
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Planned',
          value: formatCurrency(plannedAmount),
          description: 'Expected this month',
          dotColor: 'bg-info',
        },
        {
          label: 'Paid This Month',
          value: formatCurrency(paidAmount),
          description: `${paidRules.length} recorded`,
          dotColor: 'bg-success',
        },
      ]}
    />
  );
}

function getOccurrencesInMonth(rule: RecurringBillRule, selectedDate: Date) {
  if (rule.frequency === 'monthly') return 1;
  if (rule.frequency === 'custom') {
    const interval = Math.max(2, rule.customIntervalMonths ?? 1);
    return selectedDate.getMonth() % interval === 0 ? 1 : 0;
  }
  if (rule.frequency === 'quarterly') return selectedDate.getMonth() % 3 === 0 ? 1 : 0;
  if (rule.frequency === 'yearly') return selectedDate.getMonth() === 0 ? 1 : 0;

  const weekdayCount = countWeekdaysInMonth(selectedDate, rule.weeklyDay ?? rule.dueDay);
  if (rule.frequency === 'weekly') return weekdayCount;
  if (rule.frequency === 'biweekly') return Math.ceil(weekdayCount / 2);

  return 0;
}

function countWeekdaysInMonth(selectedDate: Date, dueDay: number) {
  const targetDay = Math.max(1, Math.min(dueDay, 7)) % 7;
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (new Date(year, month, day).getDay() === targetDay) count += 1;
  }

  return count;
}
