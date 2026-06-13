import { Button } from '@/app/components/ui/button';
import { useAccess } from '@/app/contexts/access-context';
import { MonthlyBillsTable } from '@/modules/monthly-bills/components/monthly-bills-table';
import { useMonthlyBillsQuery } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import {
  getMonthlyBillDateRange,
  getMonthlyBillMonthNumber,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import { Check, Pencil } from 'lucide-react';
import { useState } from 'react';

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
  const [editMode, setEditMode] = useState(false);
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
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant={editMode ? 'primary' : 'outline'}
          size="sm"
          aria-pressed={editMode}
          onClick={() => setEditMode((current) => !current)}
        >
          {editMode ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
          {editMode ? 'Done' : 'Edit'}
        </Button>
      </div>

      <MonthlyBillsTable
        groups={monthlyBillsQuery.data ?? []}
        selectedDate={selectedDate}
        canMarkPayment={canMarkPayment}
        editMode={editMode}
        isLoading={monthlyBillsQuery.isLoading}
        isError={monthlyBillsQuery.isError}
        onRetry={() => void monthlyBillsQuery.refetch()}
      />
    </div>
  );
}
