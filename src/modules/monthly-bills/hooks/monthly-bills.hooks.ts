import {
  monthlyBillsApi,
  type MonthlyBillsQueryParams,
} from '@/modules/monthly-bills/api/monthly-bills.api';
import { useQuery } from '@tanstack/react-query';

export const monthlyBillsKeys = {
  all: ['monthly-bills'] as const,
  list: (params: MonthlyBillsQueryParams) => [...monthlyBillsKeys.all, 'list', params] as const,
};

export const useMonthlyBillsQuery = (params: MonthlyBillsQueryParams, enabled = true) =>
  useQuery({
    queryKey: monthlyBillsKeys.list(params),
    queryFn: () => monthlyBillsApi.listMonthlyBills(params),
    enabled,
  });
