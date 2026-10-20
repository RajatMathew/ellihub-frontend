import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { formatDateOnly } from '@/app/lib/dates';
import type { RecurringBillsResponse } from '@/modules/monthly-bills/schemas/recurring-bills.schema';
import { FlaskConical, RotateCcw, TriangleAlert } from 'lucide-react';

interface RecurringBillsQaClockControlProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

interface RecurringBillsQaClockBannerProps {
  requestedDate: string;
  confirmedClock?: RecurringBillsResponse['meta']['qaClock'];
}

/** TEMP_RECURRING_BILLS_QA_CLOCK: visible, resettable QA-only control. */
export function RecurringBillsQaClockControl({
  value,
  onChange,
}: RecurringBillsQaClockControlProps) {
  return (
    <div className="flex w-full items-center gap-1.5 sm:w-auto">
      <label htmlFor="recurring-bills-qa-date" className="sr-only">
        Recurring bills QA date
      </label>
      <div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none">
        <FlaskConical
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-warning-soft-foreground"
        />
        <Input
          id="recurring-bills-qa-date"
          type="date"
          min="2000-01-01"
          max="2100-12-31"
          value={value ?? ''}
          variant="sm"
          aria-label="Recurring bills QA date"
          className="pl-8"
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      </div>
      {value ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          mode="icon"
          aria-label="Reset recurring bills QA date"
          title="Reset to today's date"
          onClick={() => onChange(undefined)}
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

/** TEMP_RECURRING_BILLS_QA_CLOCK: server-confirmed warning prevents silent false-positive QA. */
export function RecurringBillsQaClockBanner({
  requestedDate,
  confirmedClock,
}: RecurringBillsQaClockBannerProps) {
  const confirmed = confirmedClock?.active && confirmedClock.effectiveDate === requestedDate;

  return (
    <Alert
      variant={confirmed ? 'warning' : 'destructive'}
      appearance="light"
      size="sm"
      className="mb-4"
    >
      <AlertIcon>
        {confirmed ? <FlaskConical aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
      </AlertIcon>
      <AlertContent>
        <AlertTitle>
          {confirmed ? `QA date active: ${formatDateOnly(requestedDate)}` : 'QA date rejected'}
        </AlertTitle>
        <AlertDescription>
          {confirmed
            ? `Recurring schedules and payment-period checks use this date. The real business date is ${formatDateOnly(confirmedClock.actualDate)}.`
            : 'The API did not confirm this override. Check the backend flag, role, and QuickBooks sandbox environment.'}
        </AlertDescription>
      </AlertContent>
    </Alert>
  );
}
