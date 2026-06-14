import { PageTabs, type PageTabItem } from '@/app/components/page-tabs';
import { MONTHLY_BILL_TABS } from '@/modules/monthly-bills/constants/monthly-bills.constants';
import { getMonthlyBillMonthSearch } from '@/modules/monthly-bills/lib/monthly-bills-date';

export function MonthlyBillsTabs({ selectedDate }: { selectedDate: Date }) {
  const search = getMonthlyBillMonthSearch(selectedDate);
  const tabs: PageTabItem[] = MONTHLY_BILL_TABS.map((tab) => ({
    label: tab.label,
    value: tab.path,
    to: `/app/monthly-bills/${tab.path}${search}`,
  }));

  return <PageTabs items={tabs} ariaLabel="Monthly bills sections" />;
}
