import type { PageTabItem } from '@/app/components/page-tabs';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);

/** Year filters for the project portfolio, rendered by the page header's tab strip. */
export const PROJECT_YEAR_TABS: PageTabItem[] = [
  { label: 'ALL', value: null },
  ...YEARS.map((year) => ({ label: String(year), value: year })),
];
