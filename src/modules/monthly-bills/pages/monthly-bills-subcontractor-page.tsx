import { useAccess } from '@/app/contexts/access-context';
import { MonthlyBillsTable } from '@/modules/monthly-bills/components/monthly-bills-table';
import { useMonthlyBillsQuery } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import {
  getMonthlyBillDateRange,
  getMonthlyBillMonthNumber,
} from '@/modules/monthly-bills/lib/monthly-bills-date';

interface MonthlyBillsSubcontractorPageProps {
  selectedDate: Date;
  enabled: boolean;
}

export function MonthlyBillsSubcontractorPage({
  selectedDate,
  enabled,
}: MonthlyBillsSubcontractorPageProps) {
  const { access, isAdmin } = useAccess();
  const canMarkPayment = isAdmin || access?.role === 'accountant';
  const { startDate, endDate } = getMonthlyBillDateRange(selectedDate);
  const monthlyBillsQuery = useMonthlyBillsQuery(
    {
      startDate,
      endDate,
      month: getMonthlyBillMonthNumber(selectedDate),
      year: selectedDate.getFullYear(),
    },
    enabled
  );

  return (
    <MonthlyBillsTable
      groups={monthlyBillsQuery.data ?? []}
      selectedDate={selectedDate}
      canMarkPayment={canMarkPayment}
      isLoading={monthlyBillsQuery.isLoading}
      isError={monthlyBillsQuery.isError}
      onRetry={() => void monthlyBillsQuery.refetch()}
    />
  );
}
