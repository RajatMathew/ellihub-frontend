import { Card, CardContent } from '@/app/components/ui/card';
import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';

interface MonthlyBillsTabPageProps {
  title: string;
  selectedDate: Date;
}

/** Placeholder section for recurring and summary tabs not yet implemented. */
export function MonthlyBillsTabPage({ title, selectedDate }: MonthlyBillsTabPageProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-md bg-muted">
            <ClipboardList className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">
              No bills configured for {format(selectedDate, 'MMMM yyyy')}.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
