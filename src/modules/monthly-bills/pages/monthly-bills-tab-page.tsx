import { Card } from '@/app/components/ui/card';
import { formatMonthlyBillMonthNumber } from '@/modules/monthly-bills/lib/monthly-bills-date';

interface MonthlyBillsTabPageProps {
  title: string;
  selectedDate: Date;
}

/** Placeholder section for tabs (Recurring / Material / Summary) not yet implemented. */
export function MonthlyBillsTabPage({ title, selectedDate }: MonthlyBillsTabPageProps) {
  return (
    <Card className="space-y-3 p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          month: {formatMonthlyBillMonthNumber(selectedDate)}, year: {selectedDate.getFullYear()}
        </p>
      </div>
    </Card>
  );
}
