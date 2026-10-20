import type { PageTabItem } from '@/app/components/page-tabs';
import { MONTHLY_BILL_TABS } from '@/modules/monthly-bills/constants/monthly-bills.constants';
import { getMonthlyBillMonthSearch } from '@/modules/monthly-bills/lib/monthly-bills-date';

/**
 * Section tabs for the selected month, rendered by the page header's tab strip.
 * Each carries the month in its query string so switching section keeps it.
 */
export function getMonthlyBillTabs(selectedDate: Date): PageTabItem[] {
  const search = getMonthlyBillMonthSearch(selectedDate);

  return MONTHLY_BILL_TABS.map((tab) => ({
    label: tab.label,
    value: tab.path,
    to: `/app/monthly-bills/${tab.path}${search}`,
  }));
}
