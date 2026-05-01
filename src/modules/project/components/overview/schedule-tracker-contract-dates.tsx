import { CardContent } from '@/app/components/ui/card';
import { formatDate } from '@/app/lib/helpers';
import type { PrimeContract } from '@/modules/project/schemas/project-contract.schema';

interface ScheduleTrackerContractDatesProps {
  contract: PrimeContract | undefined;
}

export function ScheduleTrackerContractDates({
  contract,
}: ScheduleTrackerContractDatesProps) {
  const dates = [
    { label: 'Est. Start Date', value: contract?.estimatedStartDate },
    { label: 'Est. Completion Date', value: contract?.estimatedCompletionDate },
    { label: 'Actual Start Date', value: contract?.actualStartDate },
    { label: 'Actual Completion Date', value: contract?.actualCompletionDate },
  ].filter((date): date is { label: string; value: string } => !!date.value);

  if (dates.length === 0) return null;

  return (
    <CardContent className="px-5 pt-4 pb-0">
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {dates.map((date) => (
          <div key={date.label}>
            <dt className="text-xs text-muted-foreground">{date.label}</dt>
            <dd className="font-medium">{formatDate(date.value)}</dd>
          </div>
        ))}
      </dl>
    </CardContent>
  );
}
