import type { MonthlyBillsQueryParams } from '@/modules/monthly-bills/api/monthly-bills.api';
import type { RecurringBillsQueryParams } from '@/modules/monthly-bills/api/recurring-bills.api';

export const monthlyBillsKeys = {
  all: ['monthly-bills'] as const,
  lists: () => [...monthlyBillsKeys.all, 'list'] as const,
  list: (params: MonthlyBillsQueryParams) => [...monthlyBillsKeys.lists(), params] as const,
  recurring: () => [...monthlyBillsKeys.all, 'recurring'] as const,
  recurringList: (params: RecurringBillsQueryParams) =>
    [...monthlyBillsKeys.recurring(), 'list', params] as const,
};
