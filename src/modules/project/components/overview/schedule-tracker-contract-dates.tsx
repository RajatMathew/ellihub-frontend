import { CardContent } from '@/app/components/ui/card';
import { formatDate } from '@/app/lib/helpers';
import type { PrimeContract } from '@/modules/project/schemas/project-contract.schema';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';

interface ScheduleTrackerContractDatesProps {
  project: ProjectDetail;
  contract: PrimeContract | undefined;
}

export function ScheduleTrackerContractDates({
  project,
  contract,
}: ScheduleTrackerContractDatesProps) {
  const dates = [
    {
      label: 'Estimated Start Date',
      value: project.estimatedStartDate ?? contract?.estimatedStartDate,
    },
    {
      label: 'Estimated End Date',
      value: project.estimatedEndDate ?? contract?.estimatedEndDate,
    },
    { label: 'Actual Start Date', value: project.actualStartDate },
    { label: 'Actual Completion Date', value: project.actualCompletionDate },
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
