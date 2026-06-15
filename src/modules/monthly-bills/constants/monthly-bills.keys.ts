import type { MonthlyBillsQueryParams } from '@/modules/monthly-bills/api/monthly-bills.api';

export const monthlyBillsKeys = {
  all: ['monthly-bills'] as const,
  list: (params: MonthlyBillsQueryParams) => [...monthlyBillsKeys.all, 'list', params] as const,
};
