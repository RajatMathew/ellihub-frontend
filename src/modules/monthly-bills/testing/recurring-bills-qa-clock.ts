/**
 * TEMP_RECURRING_BILLS_QA_CLOCK
 *
 * Sandbox-only URL and request helpers for recurring-bill time-travel testing.
 * Remove this file and every block carrying the marker after QA.
 */
export const RECURRING_BILLS_QA_DATE_PARAM = 'recurringQaDate';
export const RECURRING_BILLS_QA_DATE_HEADER = 'x-elli-recurring-qa-date';

export const RECURRING_BILLS_QA_CLOCK_ENABLED =
  import.meta.env.DEV &&
  import.meta.env.VITE_ENABLE_RECURRING_BILLS_QA_CLOCK?.trim().toLowerCase() === 'true';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseRecurringBillsQaDate(value: string | null | undefined): Date | undefined {
  const match = value?.match(DATE_ONLY_PATTERN);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) return undefined;

  // 17:00 UTC is safely within the selected date in America/New_York year-round.
  const parsed = new Date(Date.UTC(year, month - 1, day, 17));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }

  return parsed;
}

export function getRecurringBillsQaDate(searchParams: URLSearchParams): string | undefined {
  const value = searchParams.get(RECURRING_BILLS_QA_DATE_PARAM);
  return parseRecurringBillsQaDate(value) ? (value ?? undefined) : undefined;
}
