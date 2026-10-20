import type { PageTabItem } from '@/app/components/page-tabs';
import { BUSINESS_TIME_ZONE, todayDateOnly } from '@/app/lib/dates';

// The business year, like the API's year filter.
const currentYear = Number(todayDateOnly(BUSINESS_TIME_ZONE).slice(0, 4));
const YEARS = Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);

/** Year filters for the project portfolio, rendered by the page header's tab strip. */
export const PROJECT_YEAR_TABS: PageTabItem[] = [
  { label: 'ALL', value: null },
  ...YEARS.map((year) => ({ label: String(year), value: year })),
];
